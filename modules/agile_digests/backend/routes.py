from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from modules.teams.backend.models import Team
from modules.teams.backend.schemas import TeamOut

from . import embeddings
from .models import Digest, DigestFeature
from .schemas import (
    DigestIn,
    DigestOut,
    DigestSummary,
    FeatureOut,
    SearchHit,
    SearchIn,
)

router = APIRouter()


# ---------- Digests ----------


def _summary(digest: Digest, feature_count: int) -> DigestSummary:
    return DigestSummary(
        id=digest.id,
        team=TeamOut.model_validate(digest.team),
        sprint_number=digest.sprint_number,
        year=digest.year,
        digest_date=digest.digest_date,
        feature_count=feature_count,
    )


@router.get("/digests", response_model=list[DigestSummary])
async def list_digests(
    team_id: int | None = None,
    year: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[DigestSummary]:
    feature_count = func.count(DigestFeature.id).label("feature_count")
    stmt = (
        select(Digest, feature_count)
        .join(DigestFeature, DigestFeature.digest_id == Digest.id, isouter=True)
        .options(selectinload(Digest.team))
        .group_by(Digest.id)
        .order_by(Digest.year.desc(), Digest.sprint_number.desc(), Digest.digest_date.desc())
    )
    if team_id is not None:
        stmt = stmt.where(Digest.team_id == team_id)
    if year is not None:
        stmt = stmt.where(Digest.year == year)
    result = await db.execute(stmt)
    return [_summary(d, c) for d, c in result.all()]


async def _embed_features(features) -> list[list[float] | None]:
    texts = [
        embeddings.feature_text(
            feature_name=f.feature_name,
            description=f.description,
            business_value=f.business_value,
            notes=f.notes,
        )
        for f in features
    ]
    if not texts:
        return []
    vectors = embeddings.encode_many(texts)
    return [v for v in vectors]


async def _build_digest(
    digest: Digest, payload: DigestIn, db: AsyncSession
) -> None:
    team = await db.get(Team, payload.team_id)
    if team is None:
        raise HTTPException(status_code=400, detail="team_id does not exist")
    digest.team_id = payload.team_id
    digest.sprint_number = payload.sprint_number
    digest.year = payload.year
    digest.digest_date = payload.digest_date
    digest.header_notes = payload.header_notes
    digest.footer_notes = payload.footer_notes

    vectors = await _embed_features(payload.features)
    digest.features = []
    for position, (f, vec) in enumerate(zip(payload.features, vectors, strict=True)):
        digest.features.append(
            DigestFeature(
                position=position,
                feature_name=f.feature_name,
                description=f.description,
                business_value=f.business_value,
                target_go_live=f.target_go_live,
                status=f.status,
                notes=f.notes,
                embedding=vec,
            )
        )


@router.post("/digests", response_model=DigestOut, status_code=status.HTTP_201_CREATED)
async def create_digest(payload: DigestIn, db: AsyncSession = Depends(get_db)) -> DigestOut:
    digest = Digest()
    await _build_digest(digest, payload, db)
    db.add(digest)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A digest already exists for this team, sprint, and year",
        )
    return await _load_digest_out(digest.id, db)


@router.get("/digests/{digest_id}", response_model=DigestOut)
async def get_digest(digest_id: int, db: AsyncSession = Depends(get_db)) -> DigestOut:
    return await _load_digest_out(digest_id, db)


@router.put("/digests/{digest_id}", response_model=DigestOut)
async def update_digest(
    digest_id: int, payload: DigestIn, db: AsyncSession = Depends(get_db)
) -> DigestOut:
    digest = await db.get(Digest, digest_id, options=[selectinload(Digest.features)])
    if digest is None:
        raise HTTPException(status_code=404, detail="Digest not found")
    await _build_digest(digest, payload, db)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409,
            detail="A digest already exists for this team, sprint, and year",
        )
    return await _load_digest_out(digest.id, db)


@router.delete("/digests/{digest_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_digest(digest_id: int, db: AsyncSession = Depends(get_db)) -> None:
    digest = await db.get(Digest, digest_id)
    if digest is None:
        raise HTTPException(status_code=404, detail="Digest not found")
    await db.delete(digest)
    await db.commit()


async def _load_digest_out(digest_id: int, db: AsyncSession) -> DigestOut:
    stmt = (
        select(Digest)
        .where(Digest.id == digest_id)
        .options(selectinload(Digest.team), selectinload(Digest.features))
    )
    result = await db.execute(stmt)
    digest = result.scalar_one_or_none()
    if digest is None:
        raise HTTPException(status_code=404, detail="Digest not found")
    features = sorted(digest.features, key=lambda f: f.position)
    return DigestOut(
        id=digest.id,
        team=TeamOut.model_validate(digest.team),
        sprint_number=digest.sprint_number,
        year=digest.year,
        digest_date=digest.digest_date,
        header_notes=digest.header_notes,
        footer_notes=digest.footer_notes,
        features=[FeatureOut.model_validate(f) for f in features],
        created_at=digest.created_at,
        updated_at=digest.updated_at,
    )


# ---------- Search ----------


@router.post("/digests/search", response_model=list[SearchHit])
async def search_digests(
    payload: SearchIn, db: AsyncSession = Depends(get_db)
) -> list[SearchHit]:
    query_vec = embeddings.encode(payload.q)
    distance = DigestFeature.embedding.cosine_distance(query_vec).label("distance")
    stmt = (
        select(DigestFeature, Digest, distance)
        .join(Digest, Digest.id == DigestFeature.digest_id)
        .options(selectinload(Digest.team))
        .where(DigestFeature.embedding.is_not(None))
    )
    if payload.team_id is not None:
        stmt = stmt.where(Digest.team_id == payload.team_id)
    if payload.year is not None:
        stmt = stmt.where(Digest.year == payload.year)
    stmt = stmt.order_by(distance).limit(payload.top_k)

    result = await db.execute(stmt)
    hits: list[SearchHit] = []
    for feature, digest, dist in result.all():
        hits.append(
            SearchHit(
                feature=FeatureOut.model_validate(feature),
                digest=_summary(digest, feature_count=0),
                score=float(1.0 - dist),
            )
        )
    return hits
