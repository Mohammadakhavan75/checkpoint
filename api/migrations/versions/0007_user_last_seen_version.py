"""user last_seen_version: track which changelog the user has seen

Revision ID: 0007_user_last_seen_version
Revises: 0006_remove_snapshot_url
Create Date: 2026-06-09
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_user_last_seen_version"
down_revision: Union[str, None] = "0006_remove_snapshot_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_seen_version", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_seen_version")
