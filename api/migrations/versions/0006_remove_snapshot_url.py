"""remove url from snapshot

Revision ID: 0006_remove_snapshot_url
Revises: 0005_snapshots
Create Date: 2026-06-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006_remove_snapshot_url"
down_revision: Union[str, None] = "0005_snapshots"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("snapshots", "url")


def downgrade() -> None:
    op.add_column("snapshots", sa.Column("url", sa.Text(), nullable=True))
