from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db

from .models import Person, Team, TeamMember
from .schemas import (
    MemberIn,
    MemberOut,
    PersonIn,
    PersonOut,
    PersonPatch,
    TeamDetail,
    TeamIn,
    TeamOut,
    TeamPatch,
)

router = APIRouter()


def _normalize_email(email: str | None) -> str | None:
    if email is None:
        return None
    cleaned = email.strip()
    return cleaned or None


# ---------- Teams ----------


@router.get("/teams", response_model=list[TeamOut])
async def list_teams(
    include_archived: bool = False, db: AsyncSession = Depends(get_db)
) -> list[Team]:
    stmt = select(Team).order_by(Team.name)
    if not include_archived:
        stmt = stmt.where(Team.archived_at.is_(None))
    result = await db.execute(stmt)
    return list(result.scalars())


@router.post("/teams", response_model=TeamOut, status_code=status.HTTP_201_CREATED)
async def create_team(payload: TeamIn, db: AsyncSession = Depends(get_db)) -> Team:
    team = Team(name=payload.name.strip())
    db.add(team)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Team name already exists")
    await db.refresh(team)
    return team


@router.get("/teams/{team_id}", response_model=TeamDetail)
async def get_team(team_id: int, db: AsyncSession = Depends(get_db)) -> TeamDetail:
    stmt = (
        select(Team)
        .where(Team.id == team_id)
        .options(selectinload(Team.members).selectinload(TeamMember.person))
    )
    result = await db.execute(stmt)
    team = result.scalar_one_or_none()
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    members = sorted(team.members, key=lambda m: m.person.name.lower())
    return TeamDetail(
        id=team.id,
        name=team.name,
        archived_at=team.archived_at,
        created_at=team.created_at,
        members=[MemberOut.model_validate(m) for m in members],
    )


@router.patch("/teams/{team_id}", response_model=TeamOut)
async def update_team(
    team_id: int, payload: TeamPatch, db: AsyncSession = Depends(get_db)
) -> Team:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    if payload.name is not None:
        team.name = payload.name.strip()
    if payload.archived is not None:
        team.archived_at = datetime.now(timezone.utc) if payload.archived else None
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Team name already exists")
    await db.refresh(team)
    return team


@router.delete("/teams/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_team(team_id: int, db: AsyncSession = Depends(get_db)) -> None:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    await db.delete(team)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Team is referenced by other records"
        )


# ---------- People ----------


@router.get("/people", response_model=list[PersonOut])
async def list_people(db: AsyncSession = Depends(get_db)) -> list[Person]:
    result = await db.execute(select(Person).order_by(func.lower(Person.name)))
    return list(result.scalars())


@router.post("/people", response_model=PersonOut, status_code=status.HTTP_201_CREATED)
async def create_person(payload: PersonIn, db: AsyncSession = Depends(get_db)) -> Person:
    person = Person(
        name=payload.name.strip(),
        email=_normalize_email(payload.email),
        role=payload.role.strip(),
        employment_type=payload.employment_type,
    )
    db.add(person)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A person with that email already exists")
    await db.refresh(person)
    return person


@router.patch("/people/{person_id}", response_model=PersonOut)
async def update_person(
    person_id: int, payload: PersonPatch, db: AsyncSession = Depends(get_db)
) -> Person:
    person = await db.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    if payload.name is not None:
        person.name = payload.name.strip()
    if payload.role is not None:
        person.role = payload.role.strip()
    fields_set = payload.model_fields_set
    if "email" in fields_set:
        person.email = _normalize_email(payload.email)
    if "employment_type" in fields_set:
        person.employment_type = payload.employment_type
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="A person with that email already exists")
    await db.refresh(person)
    return person


@router.delete("/people/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_person(person_id: int, db: AsyncSession = Depends(get_db)) -> None:
    person = await db.get(Person, person_id)
    if person is None:
        raise HTTPException(status_code=404, detail="Person not found")
    await db.delete(person)
    await db.commit()


# ---------- Memberships ----------


@router.post(
    "/teams/{team_id}/members",
    response_model=MemberOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_member(
    team_id: int, payload: MemberIn, db: AsyncSession = Depends(get_db)
) -> MemberOut:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    person = await db.get(Person, payload.person_id)
    if person is None:
        raise HTTPException(status_code=400, detail="person_id does not exist")

    member = TeamMember(team_id=team_id, person_id=payload.person_id)
    db.add(member)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=409, detail="Person is already a member of this team"
        )
    await db.refresh(member, attribute_names=["person"])
    return MemberOut.model_validate(member)


@router.delete(
    "/teams/{team_id}/members/{member_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_member(
    team_id: int, member_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    stmt = select(TeamMember).where(
        TeamMember.id == member_id, TeamMember.team_id == team_id
    )
    result = await db.execute(stmt)
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=404, detail="Member not found")
    await db.delete(member)
    await db.commit()
