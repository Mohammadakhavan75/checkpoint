"""personal_access_tokens: bearer credentials for the agent API (MCP v0)

One table. Reversible as a unit: `alembic downgrade -1` drops it and nothing
else depends on it. See docs/product/OBJECT_PERMANENCE_MCP.md.

Revision ID: 0014_personal_access_tokens
Revises: 0013_reminders
Create Date: 2026-07-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014_personal_access_tokens"
down_revision: Union[str, None] = "0013_reminders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "personal_access_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("token_prefix", sa.Text(), nullable=False),
        sa.Column("scopes", sa.Text(), nullable=False, server_default="agent"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("token_hash", name="uq_pats_token_hash"),
    )
    op.create_index("ix_pats_owner", "personal_access_tokens", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_pats_owner", table_name="personal_access_tokens")
    op.drop_table("personal_access_tokens")
