"""two_factor: per-user opt-in TOTP (Google Authenticator) second factor

One row per user (unique owner_id). Holds the base32 TOTP secret encrypted at
rest, the chosen enforcement points (login / delete account), bcrypt hashes of
unused one-time recovery codes, and a small verification throttle.

Revision ID: 0012_two_factor
Revises: 0011_calendar_connections
Create Date: 2026-06-24
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0012_two_factor"
down_revision: Union[str, None] = "0011_calendar_connections"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# JSONB on Postgres, generic JSON elsewhere — mirrors models.JSONVariant.
JSONVariant = sa.JSON().with_variant(JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "two_factor",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("secret_enc", sa.Text(), nullable=False),
        sa.Column(
            "enabled", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column(
            "require_for_login", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column(
            "require_for_delete", sa.Boolean(), nullable=False, server_default="true"
        ),
        sa.Column("recovery_codes", JSONVariant, nullable=False, server_default="[]"),
        sa.Column(
            "failed_attempts", sa.Integer(), nullable=False, server_default="0"
        ),
        sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("owner_id", name="uq_two_factor_owner"),
    )


def downgrade() -> None:
    op.drop_table("two_factor")
