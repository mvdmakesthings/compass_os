"""teams: add employment_type to people

Revision ID: teams_0002_employment_type
Revises: ad_0001_init
Create Date: 2026-05-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "teams_0002_employment_type"
down_revision: Union[str, None] = "ad_0001_init"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "people",
        sa.Column("employment_type", sa.String(length=20), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("people", "employment_type")
