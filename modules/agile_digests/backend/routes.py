from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from modules.teams.backend.models import Team
from modules.teams.backend.schemas import TeamOut

from . import embeddings, jira_client, jira_sync
from .models import Digest, DigestGoal, DigestUpdate, Feature
from .schemas import (
    DigestGoalOut,
    DigestIn,
    DigestOut,
    DigestSummary,
    DigestUpdateOut,
    FeatureIn,
    FeatureOut,
    LatestUpdateRef,
    SearchHit,
    SearchIn,
)

router = APIRouter()


# ---------- Jira diagnostics ----------


@router.get("/jira/status")
async def jira_status() -> dict:
    """Smoke-test the configured Jira credentials by hitting /rest/api/3/myself.

    Returns the authenticated account's email + name on success, or a structured
    error payload (no token contents) on failure. Useful for debugging
    misconfigured env vars.
    """
    import httpx

    try:
        async with jira_client._client() as c:
            resp = await c.get("/rest/api/3/myself")
        if resp.status_code == 200:
            data = resp.json()
            return {
                "ok": True,
                "base_url": jira_client._settings()[0],
                "account_id": data.get("accountId"),
                "email": data.get("emailAddress"),
                "display_name": data.get("displayName"),
            }
        return {
            "ok": False,
            "base_url": jira_client._settings()[0],
            "status": resp.status_code,
            "detail": resp.text[:300],
        }
    except jira_client.JiraConfigError as e:
        return {"ok": False, "status": "config", "detail": str(e)}
    except (httpx.HTTPError, OSError) as e:
        return {"ok": False, "status": "transport", "detail": str(e)}


# ---------- Features ----------


def _feature_out(feature: Feature) -> FeatureOut:
    out = FeatureOut.model_validate(feature)
    out.jira_sync_failed = jira_sync.has_failed_sync(feature)
    return out


async def _sync_many(db: AsyncSession, features: list[Feature]) -> None:
    # AsyncSession isn't safe for concurrent use, so refresh sequentially.
    # With the default 24h TTL most calls return immediately without a network hop.
    for f in features:
        try:
            await jira_sync.sync_feature(db, f)
        except Exception:  # defensive — sync_feature already swallows JiraError
            pass


def _embed_feature(name: str, description: str, business_value: str) -> list[float]:
    text = embeddings.feature_text(
        name=name, description=description, business_value=business_value
    )
    return embeddings.encode(text) if text else embeddings.encode(name)


@router.get(
    "/teams/{team_id}/features", response_model=list[FeatureOut]
)
async def list_team_features(
    team_id: int,
    include_archived: bool = Query(default=False),
    db: AsyncSession = Depends(get_db),
) -> list[FeatureOut]:
    if (await db.get(Team, team_id)) is None:
        raise HTTPException(status_code=404, detail="Team not found")
    stmt = select(Feature).where(Feature.team_id == team_id)
    if not include_archived:
        stmt = stmt.where(Feature.archived_at.is_(None))
    stmt = stmt.order_by(Feature.archived_at.is_not(None), Feature.name)
    result = await db.execute(stmt)
    features = list(result.scalars().all())
    await _sync_many(db, features)
    await db.commit()
    for f in features:
        await db.refresh(f)
    return [_feature_out(f) for f in features]


@router.post(
    "/teams/{team_id}/features",
    response_model=FeatureOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_feature(
    team_id: int, payload: FeatureIn, db: AsyncSession = Depends(get_db)
) -> FeatureOut:
    if (await db.get(Team, team_id)) is None:
        raise HTTPException(status_code=400, detail="team_id does not exist")
    feature = Feature(
        team_id=team_id,
        name=payload.name,
        description=payload.description,
        business_value=payload.business_value,
        jira_link=payload.jira_link,
        embedding=_embed_feature(
            payload.name, payload.description, payload.business_value
        ),
    )
    db.add(feature)
    await db.commit()
    await db.refresh(feature)
    return _feature_out(feature)


@router.get("/features/{feature_id}", response_model=FeatureOut)
async def get_feature(feature_id: int, db: AsyncSession = Depends(get_db)) -> FeatureOut:
    feature = await db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status_code=404, detail="Feature not found")
    await jira_sync.sync_feature(db, feature)
    await db.commit()
    await db.refresh(feature)
    return _feature_out(feature)


@router.post("/features/{feature_id}/refresh-jira", response_model=FeatureOut)
async def refresh_feature_jira(
    feature_id: int, db: AsyncSession = Depends(get_db)
) -> FeatureOut:
    feature = await db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status_code=404, detail="Feature not found")
    await jira_sync.sync_feature(db, feature, force=True)
    await db.commit()
    await db.refresh(feature)
    return _feature_out(feature)


@router.put("/features/{feature_id}", response_model=FeatureOut)
async def update_feature(
    feature_id: int, payload: FeatureIn, db: AsyncSession = Depends(get_db)
) -> FeatureOut:
    feature = await db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status_code=404, detail="Feature not found")
    embed_dirty = (
        feature.name != payload.name
        or feature.description != payload.description
        or feature.business_value != payload.business_value
    )
    feature.name = payload.name
    feature.description = payload.description
    feature.business_value = payload.business_value
    feature.jira_link = payload.jira_link
    if embed_dirty:
        feature.embedding = _embed_feature(
            payload.name, payload.description, payload.business_value
        )
    await db.commit()
    await db.refresh(feature)
    return _feature_out(feature)


@router.delete("/features/{feature_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_feature(
    feature_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    feature = await db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status_code=404, detail="Feature not found")
    refs = await db.execute(
        select(func.count(DigestUpdate.id)).where(DigestUpdate.feature_id == feature_id)
    )
    if refs.scalar_one() > 0:
        raise HTTPException(
            status_code=409,
            detail="Feature is referenced by one or more digests; archive it instead.",
        )
    await db.delete(feature)
    await db.commit()


@router.post("/features/{feature_id}/archive", response_model=FeatureOut)
async def archive_feature(
    feature_id: int, db: AsyncSession = Depends(get_db)
) -> FeatureOut:
    feature = await db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status_code=404, detail="Feature not found")
    if feature.archived_at is None:
        feature.archived_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(feature)
    return FeatureOut.model_validate(feature)


@router.post("/features/{feature_id}/unarchive", response_model=FeatureOut)
async def unarchive_feature(
    feature_id: int, db: AsyncSession = Depends(get_db)
) -> FeatureOut:
    feature = await db.get(Feature, feature_id)
    if feature is None:
        raise HTTPException(status_code=404, detail="Feature not found")
    if feature.archived_at is not None:
        feature.archived_at = None
        await db.commit()
        await db.refresh(feature)
    return FeatureOut.model_validate(feature)


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
    feature_count = func.count(DigestUpdate.id).label("feature_count")
    stmt = (
        select(Digest, feature_count)
        .join(DigestUpdate, DigestUpdate.digest_id == Digest.id, isouter=True)
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


async def _build_digest(
    digest: Digest, payload: DigestIn, db: AsyncSession
) -> None:
    team = await db.get(Team, payload.team_id)
    if team is None:
        raise HTTPException(status_code=400, detail="team_id does not exist")

    feature_ids = [u.feature_id for u in payload.updates]
    if len(feature_ids) != len(set(feature_ids)):
        raise HTTPException(
            status_code=400,
            detail="A digest cannot reference the same feature twice.",
        )

    if feature_ids:
        rows = await db.execute(
            select(Feature.id, Feature.team_id).where(Feature.id.in_(feature_ids))
        )
        teams_by_feature = {fid: tid for fid, tid in rows.all()}
        missing = [fid for fid in feature_ids if fid not in teams_by_feature]
        if missing:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown feature_id(s): {missing}",
            )
        wrong_team = [
            fid for fid, tid in teams_by_feature.items() if tid != payload.team_id
        ]
        if wrong_team:
            raise HTTPException(
                status_code=400,
                detail=f"feature_id(s) {wrong_team} belong to a different team",
            )

    digest.team_id = payload.team_id
    digest.sprint_number = payload.sprint_number
    digest.year = payload.year
    digest.digest_date = payload.digest_date
    digest.notes = payload.notes

    # Clear-then-flush before re-populating: the unique constraints on
    # ad_digest_updates(digest_id, feature_id) and the per-goal rows would
    # otherwise collide because SA orders INSERTs before orphan DELETEs when
    # the new and old rows share keys.
    digest.updates.clear()
    digest.goals.clear()
    await db.flush()

    digest.updates = [
        DigestUpdate(
            feature_id=u.feature_id,
            position=position,
            status=u.status,
            target_go_live=u.target_go_live,
            notes=u.notes,
        )
        for position, u in enumerate(payload.updates)
    ]

    digest.goals = [
        DigestGoal(position=i, title=g.title, completed=g.completed)
        for i, g in enumerate(payload.goals)
    ]


@router.post("/digests", response_model=DigestOut, status_code=status.HTTP_201_CREATED)
async def create_digest(payload: DigestIn, db: AsyncSession = Depends(get_db)) -> DigestOut:
    digest = Digest()
    try:
        await _build_digest(digest, payload, db)
        db.add(digest)
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
    return await _load_digest_out(digest_id, db, sync_jira=True)


@router.put("/digests/{digest_id}", response_model=DigestOut)
async def update_digest(
    digest_id: int, payload: DigestIn, db: AsyncSession = Depends(get_db)
) -> DigestOut:
    digest = await db.get(
        Digest,
        digest_id,
        options=[selectinload(Digest.updates), selectinload(Digest.goals)],
    )
    if digest is None:
        raise HTTPException(status_code=404, detail="Digest not found")
    try:
        await _build_digest(digest, payload, db)
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


async def _load_digest_out(
    digest_id: int, db: AsyncSession, *, sync_jira: bool = False
) -> DigestOut:
    stmt = (
        select(Digest)
        .where(Digest.id == digest_id)
        .options(
            selectinload(Digest.team),
            selectinload(Digest.updates).selectinload(DigestUpdate.feature),
            selectinload(Digest.goals),
        )
    )
    result = await db.execute(stmt)
    digest = result.scalar_one_or_none()
    if digest is None:
        raise HTTPException(status_code=404, detail="Digest not found")
    updates = sorted(digest.updates, key=lambda u: u.position)

    if sync_jira:
        await _sync_many(db, [u.feature for u in updates])
        await db.commit()
        for u in updates:
            await db.refresh(u.feature)

    goals = sorted(digest.goals, key=lambda g: g.position)
    return DigestOut(
        id=digest.id,
        team=TeamOut.model_validate(digest.team),
        sprint_number=digest.sprint_number,
        year=digest.year,
        digest_date=digest.digest_date,
        notes=digest.notes,
        updates=[DigestUpdateOut.model_validate(u) for u in updates],
        goals=[DigestGoalOut.model_validate(g) for g in goals],
        created_at=digest.created_at,
        updated_at=digest.updated_at,
    )


# ---------- Search ----------


@router.post("/digests/search", response_model=list[SearchHit])
async def search_features(
    payload: SearchIn, db: AsyncSession = Depends(get_db)
) -> list[SearchHit]:
    query_vec = embeddings.encode(payload.q)
    distance = Feature.embedding.cosine_distance(query_vec).label("distance")
    stmt = (
        select(Feature, distance)
        .options(selectinload(Feature.team))
        .where(Feature.embedding.is_not(None))
    )
    if payload.team_id is not None:
        stmt = stmt.where(Feature.team_id == payload.team_id)
    stmt = stmt.order_by(distance).limit(payload.top_k)

    result = await db.execute(stmt)
    rows = result.all()
    if not rows:
        return []

    feature_ids = [f.id for f, _ in rows]
    latest_stmt = (
        select(DigestUpdate, Digest)
        .join(Digest, Digest.id == DigestUpdate.digest_id)
        .where(DigestUpdate.feature_id.in_(feature_ids))
        .order_by(
            DigestUpdate.feature_id,
            Digest.year.desc(),
            Digest.sprint_number.desc(),
            Digest.digest_date.desc(),
        )
    )
    latest_rows = (await db.execute(latest_stmt)).all()
    latest_by_feature: dict[int, LatestUpdateRef] = {}
    for upd, dig in latest_rows:
        if upd.feature_id in latest_by_feature:
            continue
        latest_by_feature[upd.feature_id] = LatestUpdateRef(
            digest_id=dig.id,
            sprint_number=dig.sprint_number,
            year=dig.year,
            digest_date=dig.digest_date,
            notes=upd.notes,
            status=upd.status,
            target_go_live=upd.target_go_live,
        )

    hits: list[SearchHit] = []
    for feature, dist in rows:
        hits.append(
            SearchHit(
                feature=_feature_out(feature),
                team=TeamOut.model_validate(feature.team),
                latest_update=latest_by_feature.get(feature.id),
                score=float(1.0 - dist),
            )
        )
    return hits
