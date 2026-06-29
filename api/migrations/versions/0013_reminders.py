"""reminders: web-push subscriptions, task reminders, per-user settings (ADR-001)

Three tables for the active-reminder subsystem:
  * push_subscriptions — one row per granted browser/device (endpoint encrypted).
  * reminders          — one-shot, task-set reminders fired at an absolute time.
  * user_settings      — per-user reminder prefs + resume-nudge back-off state.

Reversible as a unit: `alembic downgrade -1` drops all three and nothing else
depends on them.

Revision ID: 0013_reminders
Revises: 0012_two_factor
Create Date: 2026-06-29
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "0013_reminders"
down_revision: Union[str, None] = "0012_two_factor"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# JSONB on Postgres, generic JSON elsewhere — mirrors models.JSONVariant.
JSONVariant = sa.JSON().with_variant(JSONB(), "postgresql")


def upgrade() -> None:
    op.create_table(
        "push_subscriptions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("endpoint_enc", sa.Text(), nullable=False),
        sa.Column("endpoint_hash", sa.Text(), nullable=False),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("failed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "owner_id", "endpoint_hash", name="uq_push_owner_endpoint"
        ),
    )
    op.create_index(
        "ix_push_subscriptions_owner", "push_subscriptions", ["owner_id"]
    )

    op.create_table(
        "reminders",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "item_id",
            sa.Uuid(),
            sa.ForeignKey("items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("fire_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False, server_default="task"),
        sa.Column("status", sa.Text(), nullable=False, server_default="pending"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
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
    )
    op.create_index(
        "ix_reminders_status_fire", "reminders", ["status", "fire_at"]
    )
    op.create_index("ix_reminders_owner", "reminders", ["owner_id"])
    op.create_index("ix_reminders_item", "reminders", ["item_id"])

    op.create_table(
        "user_settings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "reminders_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
        sa.Column(
            "nudge_opt_in", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column("quiet_hours_start", sa.Text(), nullable=True),
        sa.Column("quiet_hours_end", sa.Text(), nullable=True),
        sa.Column("time_zone", sa.Text(), nullable=True),
        sa.Column("nudge_state", JSONVariant, nullable=False, server_default="{}"),
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
        sa.UniqueConstraint("owner_id", name="uq_user_settings_owner"),
    )


def downgrade() -> None:
    op.drop_table("user_settings")
    op.drop_index("ix_reminders_item", table_name="reminders")
    op.drop_index("ix_reminders_owner", table_name="reminders")
    op.drop_index("ix_reminders_status_fire", table_name="reminders")
    op.drop_table("reminders")
    op.drop_index("ix_push_subscriptions_owner", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
