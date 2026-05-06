from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

EmploymentType = Literal["fte", "contractor"]


class TeamIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class TeamPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    archived: bool | None = None


class TeamOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    archived_at: datetime | None
    created_at: datetime


class PersonIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=255)
    role: str = Field(default="", max_length=80)
    employment_type: EmploymentType | None = None


class PersonPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    email: str | None = Field(default=None, max_length=255)
    role: str | None = Field(default=None, max_length=80)
    employment_type: EmploymentType | None = None


class PersonOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str | None
    role: str
    employment_type: EmploymentType | None
    created_at: datetime


class MemberIn(BaseModel):
    person_id: int


class MemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    person: PersonOut
    created_at: datetime


class TeamDetail(TeamOut):
    members: list[MemberOut]
