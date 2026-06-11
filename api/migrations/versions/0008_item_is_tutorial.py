"""item is_tutorial: mark the seeded first-run tutorial item

Revision ID: 0008_item_is_tutorial
Revises: 0007_user_last_seen_version
Create Date: 2026-06-10
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_item_is_tutorial"
down_revision: Union[str, None] = "0007_user_last_seen_version"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "items",
        sa.Column(
            "is_tutorial", sa.Boolean(), nullable=False, server_default=sa.false()
        ),
    )


def downgrade() -> None:
    op.drop_column("items", "is_tutorial")
