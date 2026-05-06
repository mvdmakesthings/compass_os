from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Category = Literal["in_progress", "upcoming"]
Status = Literal["on_track", "at_risk", "blocked", "complete", "unknown"]


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


class FeatureIn(BaseModel):
    category: Category
    feature_name: str = Field(min_length=1, max_length=200)
    description: str = ""
    business_value: str = ""
    target_go_live: str = ""
    status: Status
    notes: str = ""


class FeatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    category: Category
    position: int
    feature_name: str
    description: str
    business_value: str
    target_go_live: str
    status: Status
    notes: str


class DigestIn(BaseModel):
    team_id: int
    sprint_number: int = Field(ge=0)
    year: int = Field(ge=2000, le=2100)
    digest_date: date
    header_notes: str = ""
    footer_notes: str = ""
    features: list[FeatureIn] = Field(default_factory=list)


class DigestSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    team: TeamOut
    sprint_number: int
    year: int
    digest_date: date
    feature_count: int


class DigestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    team: TeamOut
    sprint_number: int
    year: int
    digest_date: date
    header_notes: str
    footer_notes: str
    features: list[FeatureOut]
    created_at: datetime
    updated_at: datetime


class SearchIn(BaseModel):
    q: str = Field(min_length=1)
    top_k: int = Field(default=20, ge=1, le=100)
    team_id: int | None = None
    year: int | None = None


class SearchHit(BaseModel):
    feature: FeatureOut
    digest: DigestSummary
    score: float
