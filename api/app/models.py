"""SQLAlchemy models: User, Item, Checkpoint.

The data is block-tree shaped: an Item may reference a parent Item (a
"container" with "phases"). Free-text / mode-varying prose lives in the
``fields`` JSON column so adding fields never needs a migration.
"""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    Text,
    Uuid,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


# JSONB on Postgres, generic JSON everywhere else (e.g. SQLite in tests).
JSONVariant = JSON().with_variant(JSONB(), "postgresql")


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    # nullable: Google-only accounts have no local password
    hashed_password: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Google account subject id; lets the same email sign in via Google + password
    google_sub: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class Item(Base):
    __tablename__ = "items"
    __table_args__ = (
        Index("ix_items_owner", "owner_id"),
        Index("ix_items_parent", "parent_id"),
        Index("ix_items_owner_daily", "owner_id", "daily"),
        Index("ix_items_owner_domain", "owner_id", "domain"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # null = top-level item
    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("items.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(Text, nullable=False)
    domain: Mapped[str] = mapped_column(Text, nullable=False)
    state: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str | None] = mapped_column(Text, nullable=True)
    daily: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    compiled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    procedure: Mapped[str | None] = mapped_column(Text, nullable=True)  # known|unknown
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)  # bounded|unbounded
    fields: Mapped[dict] = mapped_column(JSONVariant, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Checkpoint(Base):
    """Append-only history. Never UPDATE or DELETE a checkpoint row."""

    __tablename__ = "checkpoints"
    __table_args__ = (Index("ix_checkpoints_item", "item_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("items.id", ondelete="CASCADE"), nullable=False
    )
    outcome: Mapped[str] = mapped_column(Text, nullable=False)
    last_state: Mapped[str] = mapped_column(Text, nullable=False)
    what_changed: Mapped[str | None] = mapped_column(Text, nullable=True)
    problems: Mapped[str | None] = mapped_column(Text, nullable=True)
    next_action: Mapped[str] = mapped_column(Text, nullable=False)
    resume_from: Mapped[str] = mapped_column(Text, nullable=False)
    do_not_redo: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
