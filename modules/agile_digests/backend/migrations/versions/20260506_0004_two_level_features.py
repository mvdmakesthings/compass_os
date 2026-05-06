"""agile_digests: split into team-owned features + per-digest updates

Revision ID: ad_0004_two_level_features
Revises: ad_0003_feature_jira_link
Create Date: 2026-05-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "ad_0004_two_level_features"
down_revision: Union[str, None] = "ad_0003_feature_jira_link"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ad_features",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "team_id",
            sa.Integer(),
            sa.ForeignKey("teams.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("business_value", sa.Text(), nullable=False, server_default=""),
        sa.Column("jira_link", sa.Text(), nullable=False, server_default=""),
        sa.Column("embedding", Vector(384), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.Column("legacy_digest_feature_id", sa.Integer(), nullable=True),
    )

    op.execute(
        """
        INSERT INTO ad_features
            (team_id, name, description, business_value, jira_link,
             embedding, archived_at, legacy_digest_feature_id)
        SELECT d.team_id, df.feature_name, df.description, df.business_value,
               df.jira_link, df.embedding, NULL, df.id
        FROM ad_digest_features df
        JOIN ad_digests d ON df.digest_id = d.id
        ORDER BY df.id
        """
    )

    op.create_table(
        "ad_digest_updates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "digest_id",
            sa.Integer(),
            sa.ForeignKey("ad_digests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "feature_id",
            sa.Integer(),
            sa.ForeignKey("ad_features.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("target_go_live", sa.Text(), nullable=False, server_default=""),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
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
            "digest_id", "feature_id", name="uq_ad_digest_updates_digest_feature"
        ),
        sa.CheckConstraint(
            "status IN ('on_track', 'at_risk', 'blocked', 'complete', 'unknown')",
            name="ad_digest_updates_status_chk",
        ),
    )

    op.execute(
        """
        INSERT INTO ad_digest_updates
            (digest_id, feature_id, position, status, target_go_live, notes)
        SELECT df.digest_id, f.id, df.position, df.status, df.target_go_live, df.notes
        FROM ad_digest_features df
        JOIN ad_features f ON f.legacy_digest_feature_id = df.id
        """
    )

    op.drop_column("ad_features", "legacy_digest_feature_id")

    op.execute("DROP INDEX IF EXISTS ix_ad_digest_features_embedding")
    op.drop_index("ix_ad_digest_features_digest_pos", table_name="ad_digest_features")
    op.drop_table("ad_digest_features")

    op.create_index("ix_ad_features_team_id", "ad_features", ["team_id"])
    op.create_index(
        "ix_ad_features_team_active",
        "ad_features",
        ["team_id"],
        postgresql_where=sa.text("archived_at IS NULL"),
    )
    op.execute(
        "CREATE INDEX ix_ad_features_embedding "
        "ON ad_features USING hnsw (embedding vector_cosine_ops)"
    )
    op.create_index(
        "ix_ad_digest_updates_digest_pos",
        "ad_digest_updates",
        ["digest_id", "position"],
    )
    op.create_index(
        "ix_ad_digest_updates_feature",
        "ad_digest_updates",
        ["feature_id"],
    )


def downgrade() -> None:
    raise NotImplementedError(
        "ad_0004_two_level_features is one-way; restore from a backup if needed."
    )
