"""item time fields: start_at/end_at/deadline/all_day + gcal provenance columns

Adds the scheduling columns that drive the Today/Ready date windows, plus the
provenance columns (source/external_*) used by the read-only Google Calendar
mirror. The external columns are inert until the calendar feature populates
them; they ship here so the items table only migrates once.

Revision ID: 0010_item_time_fields
Revises: 0009_item_deleted_at
Create Date: 2026-06-21
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010_item_time_fields"
down_revision: Union[str, None] = "0009_item_deleted_at"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("items", sa.Column("start_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("items", sa.Column("end_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("items", sa.Column("deadline", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "items",
        sa.Column("all_day", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column(
        "items",
        sa.Column("source", sa.Text(), nullable=False, server_default="local"),
    )
    op.add_column("items", sa.Column("external_id", sa.Text(), nullable=True))
    op.add_column("items", sa.Column("external_etag", sa.Text(), nullable=True))
    op.add_column(
        "items",
        sa.Column("external_updated_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("ix_items_owner_start", "items", ["owner_id", "start_at"])
    op.create_index("ix_items_owner_deadline", "items", ["owner_id", "deadline"])
    # Partial unique: one mirrored row per external event per owner; local items
    # (external_id IS NULL) are exempt.
    op.create_index(
        "uq_items_owner_external",
        "items",
        ["owner_id", "source", "external_id"],
        unique=True,
        postgresql_where=sa.text("external_id IS NOT NULL"),
        sqlite_where=sa.text("external_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_items_owner_external", table_name="items")
    op.drop_index("ix_items_owner_deadline", table_name="items")
    op.drop_index("ix_items_owner_start", table_name="items")
    op.drop_column("items", "external_updated_at")
    op.drop_column("items", "external_etag")
    op.drop_column("items", "external_id")
    op.drop_column("items", "source")
    op.drop_column("items", "all_day")
    op.drop_column("items", "deadline")
    op.drop_column("items", "end_at")
    op.drop_column("items", "start_at")
