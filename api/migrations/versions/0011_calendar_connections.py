"""calendar_connections: per-user connected Google Calendar (read-only mirror)

Holds the OAuth tokens (encrypted at rest), the incremental sync token, and the
calendar timezone. One row per user (unique owner_id).

Revision ID: 0011_calendar_connections
Revises: 0010_item_time_fields
Create Date: 2026-06-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_calendar_connections"
down_revision: Union[str, None] = "0010_item_time_fields"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "calendar_connections",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("google_sub", sa.Text(), nullable=True),
        sa.Column("google_email", sa.Text(), nullable=True),
        sa.Column("refresh_token_enc", sa.Text(), nullable=False),
        sa.Column("access_token_enc", sa.Text(), nullable=True),
        sa.Column("access_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scope", sa.Text(), nullable=True),
        sa.Column(
            "calendar_id", sa.Text(), nullable=False, server_default="primary"
        ),
        sa.Column("time_zone", sa.Text(), nullable=True),
        sa.Column("sync_token", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False, server_default="active"),
        sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.Text(), nullable=True),
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
        sa.UniqueConstraint("owner_id", name="uq_calendar_connections_owner"),
    )


def downgrade() -> None:
    op.drop_table("calendar_connections")
