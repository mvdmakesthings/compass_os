from datetime import date, datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from modules.teams.backend.models import Team

EMBEDDING_DIM = 384

VALID_STATUSES = ("on_track", "at_risk", "blocked", "complete", "unknown")


class Feature(Base):
    __tablename__ = "ad_features"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    business_value: Mapped[str] = mapped_column(Text, nullable=False, default="")
    jira_link: Mapped[str] = mapped_column(Text, nullable=False, default="")
    jira_issue_key: Mapped[str | None] = mapped_column(String(32), nullable=True)
    jira_status: Mapped[str | None] = mapped_column(String(64), nullable=True)
    jira_status_category: Mapped[str | None] = mapped_column(String(32), nullable=True)
    jira_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    jira_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    jira_acceptance_criteria: Mapped[str | None] = mapped_column(Text, nullable=True)
    jira_target_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    jira_capitalizable: Mapped[str | None] = mapped_column(String(64), nullable=True)
    jira_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    jira_sync_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    jira_sync_error_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))
    archived_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    team: Mapped[Team] = relationship()


class Digest(Base):
    __tablename__ = "ad_digests"
    __table_args__ = (UniqueConstraint("team_id", "sprint_number", "year"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(
        ForeignKey("teams.id", ondelete="RESTRICT"), nullable=False
    )
    sprint_number: Mapped[int] = mapped_column(Integer, nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    digest_date: Mapped[date] = mapped_column(Date, nullable=False)
    header_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    footer_notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    team: Mapped[Team] = relationship()
    updates: Mapped[list["DigestUpdate"]] = relationship(
        back_populates="digest",
        cascade="all, delete-orphan",
        order_by="DigestUpdate.position",
    )


class DigestUpdate(Base):
    __tablename__ = "ad_digest_updates"
    __table_args__ = (
        UniqueConstraint("digest_id", "feature_id", name="uq_ad_digest_updates_digest_feature"),
        CheckConstraint(
            "status IN ('on_track', 'at_risk', 'blocked', 'complete', 'unknown')",
            name="ad_digest_updates_status_chk",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    digest_id: Mapped[int] = mapped_column(
        ForeignKey("ad_digests.id", ondelete="CASCADE"), nullable=False
    )
    feature_id: Mapped[int] = mapped_column(
        ForeignKey("ad_features.id", ondelete="RESTRICT"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    target_go_live: Mapped[str] = mapped_column(Text, nullable=False, default="")
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    digest: Mapped[Digest] = relationship(back_populates="updates")
    feature: Mapped[Feature] = relationship()
