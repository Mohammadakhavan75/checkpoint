"""initial schema: users, items, checkpoints

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-06
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("hashed_password", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )

    op.create_table(
        "items",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.Text(), nullable=False),
        sa.Column("domain", sa.Text(), nullable=False),
        sa.Column("state", sa.Text(), nullable=False),
        sa.Column("mode", sa.Text(), nullable=True),
        sa.Column("daily", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("compiled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("procedure", sa.Text(), nullable=True),
        sa.Column("scope", sa.Text(), nullable=True),
        sa.Column(
            "fields",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["parent_id"], ["items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_items_owner", "items", ["owner_id"])
    op.create_index("ix_items_parent", "items", ["parent_id"])
    op.create_index("ix_items_owner_daily", "items", ["owner_id", "daily"])
    op.create_index("ix_items_owner_domain", "items", ["owner_id", "domain"])

    op.create_table(
        "checkpoints",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("item_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("outcome", sa.Text(), nullable=False),
        sa.Column("last_state", sa.Text(), nullable=False),
        sa.Column("what_changed", sa.Text(), nullable=True),
        sa.Column("problems", sa.Text(), nullable=True),
        sa.Column("next_action", sa.Text(), nullable=False),
        sa.Column("resume_from", sa.Text(), nullable=False),
        sa.Column("do_not_redo", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["item_id"], ["items.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_checkpoints_item",
        "checkpoints",
        ["item_id", sa.text("created_at DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_checkpoints_item", table_name="checkpoints")
    op.drop_table("checkpoints")
    op.drop_index("ix_items_owner_domain", table_name="items")
    op.drop_index("ix_items_owner_daily", table_name="items")
    op.drop_index("ix_items_parent", table_name="items")
    op.drop_index("ix_items_owner", table_name="items")
    op.drop_table("items")
    op.drop_table("users")
