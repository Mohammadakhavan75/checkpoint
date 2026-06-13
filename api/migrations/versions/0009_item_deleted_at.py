"""item deleted_at: trash timestamp for the 30-day auto-purge

Revision ID: 0009_item_deleted_at
Revises: 0008_item_is_tutorial
Create Date: 2026-06-13
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009_item_deleted_at"
down_revision: Union[str, None] = "0008_item_is_tutorial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "items",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("items", "deleted_at")
