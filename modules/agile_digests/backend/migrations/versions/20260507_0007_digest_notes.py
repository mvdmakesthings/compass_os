"""agile_digests: collapse header/footer notes into a single notes field

Revision ID: ad_0007_digest_notes
Revises: ad_0006_digest_goals
Create Date: 2026-05-07
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "ad_0007_digest_notes"
down_revision: Union[str, None] = "ad_0006_digest_goals"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "ad_digests",
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
    )
    # Merge existing header/footer text into the new column. Use a blank line
    # between them so paragraphs stay legible; trim cleanly when one is empty.
    op.execute(
        """
        UPDATE ad_digests
        SET notes = TRIM(BOTH E'\n' FROM
            CASE
                WHEN header_notes <> '' AND footer_notes <> ''
                    THEN header_notes || E'\n\n' || footer_notes
                WHEN header_notes <> '' THEN header_notes
                ELSE footer_notes
            END
        )
        """
    )
    op.drop_column("ad_digests", "header_notes")
    op.drop_column("ad_digests", "footer_notes")


def downgrade() -> None:
    op.add_column(
        "ad_digests",
        sa.Column("header_notes", sa.Text(), nullable=False, server_default=""),
    )
    op.add_column(
        "ad_digests",
        sa.Column("footer_notes", sa.Text(), nullable=False, server_default=""),
    )
    op.execute("UPDATE ad_digests SET header_notes = notes")
    op.drop_column("ad_digests", "notes")
