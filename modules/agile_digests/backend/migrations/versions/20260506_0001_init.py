"""agile_digests: initial schema

Revision ID: ad_0001_init
Revises:
Create Date: 2026-05-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "ad_0001_init"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "ad_teams",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )

    op.create_table(
        "ad_digests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "team_id",
            sa.Integer(),
            sa.ForeignKey("ad_teams.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("sprint_number", sa.Integer(), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("digest_date", sa.Date(), nullable=False),
        sa.Column("header_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("footer_notes", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.UniqueConstraint(
            "team_id", "sprint_number", "year", name="uq_ad_digests_team_sprint_year"
        ),
    )
    op.create_index("ix_ad_digests_team_id", "ad_digests", ["team_id"])
    op.create_index("ix_ad_digests_year", "ad_digests", ["year"])

    op.create_table(
        "ad_digest_features",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "digest_id",
            sa.Integer(),
            sa.ForeignKey("ad_digests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("category", sa.String(length=20), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("feature_name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("business_value", sa.Text(), nullable=False, server_default=""),
        sa.Column("target_go_live", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("embedding", Vector(384), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "category IN ('in_progress', 'upcoming')",
            name="ad_digest_features_category_chk",
        ),
        sa.CheckConstraint(
            "status IN ('on_track', 'at_risk', 'blocked', 'complete', 'unknown')",
            name="ad_digest_features_status_chk",
        ),
    )
    op.create_index(
        "ix_ad_digest_features_digest_cat_pos",
        "ad_digest_features",
        ["digest_id", "category", "position"],
    )
    op.execute(
        "CREATE INDEX ix_ad_digest_features_embedding "
        "ON ad_digest_features USING hnsw (embedding vector_cosine_ops)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_ad_digest_features_embedding")
    op.drop_index("ix_ad_digest_features_digest_cat_pos", table_name="ad_digest_features")
    op.drop_table("ad_digest_features")
    op.drop_index("ix_ad_digests_year", table_name="ad_digests")
    op.drop_index("ix_ad_digests_team_id", table_name="ad_digests")
    op.drop_table("ad_digests")
    op.drop_table("ad_teams")
