"""google auth: nullable password + google_sub on users

Revision ID: 0002_google_auth
Revises: 0001_initial
Create Date: 2026-06-06
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_google_auth"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("users", "hashed_password", existing_type=sa.Text(), nullable=True)
    op.add_column("users", sa.Column("google_sub", sa.Text(), nullable=True))
    op.create_unique_constraint("uq_users_google_sub", "users", ["google_sub"])


def downgrade() -> None:
    op.drop_constraint("uq_users_google_sub", "users", type_="unique")
    op.drop_column("users", "google_sub")
    op.alter_column("users", "hashed_password", existing_type=sa.Text(), nullable=False)
