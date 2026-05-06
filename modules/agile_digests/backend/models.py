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

EMBEDDING_DIM = 384

VALID_CATEGORIES = ("in_progress", "upcoming")
VALID_STATUSES = ("on_track", "at_risk", "blocked", "complete", "unknown")


class Team(Base):
    __tablename__ = "ad_teams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    archived_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    digests: Mapped[list["Digest"]] = relationship(back_populates="team")


class Digest(Base):
    __tablename__ = "ad_digests"
    __table_args__ = (UniqueConstraint("team_id", "sprint_number", "year"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    team_id: Mapped[int] = mapped_column(
        ForeignKey("ad_teams.id", ondelete="RESTRICT"), nullable=False
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

    team: Mapped[Team] = relationship(back_populates="digests")
    features: Mapped[list["DigestFeature"]] = relationship(
        back_populates="digest",
        cascade="all, delete-orphan",
        order_by="DigestFeature.position",
    )


class DigestFeature(Base):
    __tablename__ = "ad_digest_features"
    __table_args__ = (
        CheckConstraint(
            "category IN ('in_progress', 'upcoming')", name="ad_digest_features_category_chk"
        ),
        CheckConstraint(
            "status IN ('on_track', 'at_risk', 'blocked', 'complete', 'unknown')",
            name="ad_digest_features_status_chk",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    digest_id: Mapped[int] = mapped_column(
        ForeignKey("ad_digests.id", ondelete="CASCADE"), nullable=False
    )
    category: Mapped[str] = mapped_column(String(20), nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    feature_name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    business_value: Mapped[str] = mapped_column(Text, nullable=False, default="")
    target_go_live: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=False, default="")
    embedding: Mapped[list[float] | None] = mapped_column(Vector(EMBEDDING_DIM))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    digest: Mapped[Digest] = relationship(back_populates="features")
