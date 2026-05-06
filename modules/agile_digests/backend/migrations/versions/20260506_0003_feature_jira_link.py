"""agile_digests: add optional jira_link to features

Revision ID: ad_0003_feature_jira_link
Revises: ad_0002_drop_feature_category
Create Date: 2026-05-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "ad_0003_feature_jira_link"
down_revision: Union[str, None] = "ad_0002_drop_feature_category"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ad_digest_features",
        sa.Column(
            "jira_link",
            sa.Text(),
            nullable=False,
            server_default="",
        ),
    )


def downgrade() -> None:
    op.drop_column("ad_digest_features", "jira_link")
