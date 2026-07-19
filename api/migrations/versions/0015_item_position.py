"""item position: sibling order for a container's phases

One nullable=False integer defaulting to 0. Existing rows backfill to 0, so
containers keep their current created_at order until a phase is reordered.
Reversible as a unit: `alembic downgrade -1` drops the column.

Revision ID: 0015_item_position
Revises: 0014_personal_access_tokens
Create Date: 2026-07-19
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015_item_position"
down_revision: Union[str, None] = "0014_personal_access_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "items",
        sa.Column(
            "position", sa.Integer(), nullable=False, server_default="0"
        ),
    )


def downgrade() -> None:
    op.drop_column("items", "position")
