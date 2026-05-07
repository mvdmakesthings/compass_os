"""agile_digests: per-digest sprint goals

Revision ID: ad_0006_digest_goals
Revises: ad_0005_feature_jira_metadata
Create Date: 2026-05-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "ad_0006_digest_goals"
down_revision: Union[str, None] = "ad_0005_feature_jira_metadata"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ad_digest_goals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "digest_id",
            sa.Integer(),
            sa.ForeignKey("ad_digests.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column(
            "completed",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "ix_ad_digest_goals_digest_id",
        "ad_digest_goals",
        ["digest_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_ad_digest_goals_digest_id", table_name="ad_digest_goals")
    op.drop_table("ad_digest_goals")
