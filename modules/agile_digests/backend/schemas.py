from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from modules.teams.backend.schemas import TeamOut

Status = Literal["on_track", "at_risk", "blocked", "complete", "unknown"]


# ---------- Features ----------


class FeatureIn(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    business_value: str = ""
    jira_link: str = ""


class FeatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    team_id: int
    name: str
    description: str
    business_value: str
    jira_link: str
    archived_at: datetime | None
    created_at: datetime
    updated_at: datetime

    # Jira metadata (populated lazily by the sync service)
    jira_issue_key: str | None = None
    jira_status: str | None = None
    jira_status_category: str | None = None
    jira_summary: str | None = None
    jira_description: str | None = None
    jira_acceptance_criteria: str | None = None
    jira_target_end: date | None = None
    jira_capitalizable: str | None = None
    jira_synced_at: datetime | None = None
    jira_sync_error: str | None = None
    jira_sync_error_at: datetime | None = None
    jira_sync_failed: bool = False


# ---------- Digest updates ----------


class DigestUpdateIn(BaseModel):
    feature_id: int
    status: Status
    target_go_live: str = ""
    notes: str = ""


class DigestUpdateOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    feature: FeatureOut
    position: int
    status: Status
    target_go_live: str
    notes: str


# ---------- Digest goals ----------


class DigestGoalIn(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    completed: bool = False


class DigestGoalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    title: str
    completed: bool


# ---------- Digests ----------


class DigestIn(BaseModel):
    team_id: int
    sprint_number: int = Field(ge=0)
    year: int = Field(ge=2000, le=2100)
    digest_date: date
    notes: str = ""
    updates: list[DigestUpdateIn] = Field(default_factory=list)
    goals: list[DigestGoalIn] = Field(default_factory=list)


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
    notes: str
    updates: list[DigestUpdateOut]
    goals: list[DigestGoalOut] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


# ---------- Search ----------


class SearchIn(BaseModel):
    q: str = Field(min_length=1)
    top_k: int = Field(default=20, ge=1, le=100)
    team_id: int | None = None


class LatestUpdateRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    digest_id: int
    sprint_number: int
    year: int
    digest_date: date
    notes: str
    status: Status
    target_go_live: str


class SearchHit(BaseModel):
    feature: FeatureOut
    team: TeamOut
    latest_update: LatestUpdateRef | None
    score: float
