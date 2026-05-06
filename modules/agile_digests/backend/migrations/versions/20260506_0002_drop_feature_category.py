"""agile_digests: drop feature category

Collapses in_progress + upcoming categories into a single ordered list.
Re-sequences position so in_progress rows precede upcoming rows within
each digest, preserving relative order inside each bucket.

Revision ID: ad_0002_drop_feature_category
Revises: ad_0001_init
Create Date: 2026-05-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "ad_0002_drop_feature_category"
down_revision: Union[str, None] = "teams_0002_employment_type"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        WITH ranked AS (
            SELECT id,
                   ROW_NUMBER() OVER (
                       PARTITION BY digest_id
                       ORDER BY CASE category
                                  WHEN 'in_progress' THEN 0
                                  WHEN 'upcoming' THEN 1
                                END,
                                position
                   ) - 1 AS new_position
            FROM ad_digest_features
        )
        UPDATE ad_digest_features f
        SET position = ranked.new_position
        FROM ranked
        WHERE f.id = ranked.id
        """
    )
    op.drop_index(
        "ix_ad_digest_features_digest_cat_pos", table_name="ad_digest_features"
    )
    op.drop_constraint(
        "ad_digest_features_category_chk", "ad_digest_features", type_="check"
    )
    op.drop_column("ad_digest_features", "category")
    op.create_index(
        "ix_ad_digest_features_digest_pos",
        "ad_digest_features",
        ["digest_id", "position"],
    )


def downgrade() -> None:
    op.drop_index(
        "ix_ad_digest_features_digest_pos", table_name="ad_digest_features"
    )
    op.add_column(
        "ad_digest_features",
        sa.Column(
            "category",
            sa.String(length=20),
            nullable=False,
            server_default="in_progress",
        ),
    )
    op.alter_column("ad_digest_features", "category", server_default=None)
    op.create_check_constraint(
        "ad_digest_features_category_chk",
        "ad_digest_features",
        "category IN ('in_progress', 'upcoming')",
    )
    op.create_index(
        "ix_ad_digest_features_digest_cat_pos",
        "ad_digest_features",
        ["digest_id", "category", "position"],
    )
