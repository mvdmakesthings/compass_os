"""agile_digests: cache Jira metadata on features

Revision ID: ad_0005_feature_jira_metadata
Revises: ad_0004_two_level_features
Create Date: 2026-05-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "ad_0005_feature_jira_metadata"
down_revision: Union[str, None] = "ad_0004_two_level_features"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


JIRA_COLUMNS = [
    ("jira_issue_key", sa.String(length=32)),
    ("jira_status", sa.String(length=64)),
    ("jira_status_category", sa.String(length=32)),
    ("jira_summary", sa.Text()),
    ("jira_description", sa.Text()),
    ("jira_acceptance_criteria", sa.Text()),
    ("jira_target_end", sa.Date()),
    ("jira_capitalizable", sa.String(length=64)),
    ("jira_synced_at", sa.DateTime(timezone=True)),
    ("jira_sync_error", sa.Text()),
    ("jira_sync_error_at", sa.DateTime(timezone=True)),
]


def upgrade() -> None:
    for name, type_ in JIRA_COLUMNS:
        op.add_column("ad_features", sa.Column(name, type_, nullable=True))
    op.create_index(
        "ix_ad_features_jira_issue_key",
        "ad_features",
        ["jira_issue_key"],
    )


def downgrade() -> None:
    op.drop_index("ix_ad_features_jira_issue_key", table_name="ad_features")
    for name, _ in reversed(JIRA_COLUMNS):
        op.drop_column("ad_features", name)
