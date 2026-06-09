"""user profile: name + picture from Google

Revision ID: 0003_user_profile
Revises: 0002_google_auth
Create Date: 2026-06-07
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_user_profile"
down_revision: Union[str, None] = "0002_google_auth"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("name", sa.Text(), nullable=True))
    op.add_column("users", sa.Column("picture", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "picture")
    op.drop_column("users", "name")
