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
    Integer,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
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
    # display profile (populated from Google; null for password-only accounts)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    picture: Mapped[str | None] = mapped_column(Text, nullable=True)
    # The app version this user last saw release notes for. NULL means "never
    # shown" — new registrations and pre-feature accounts are baselined to the
    # current version on first login, so they don't get a retroactive changelog.
    last_seen_version: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    @property
    def has_password(self) -> bool:
        """Exposed via UserOut so the client can offer "set a password"."""
        return self.hashed_password is not None


class TwoFactorSettings(Base):
    """A user's opt-in TOTP (Google Authenticator) second factor. One per user.

    Kept in its own table — like ``CalendarConnection`` — so the security secret
    and its state don't bloat ``users`` with nullable columns. ``secret_enc`` is
    the base32 TOTP secret encrypted at rest (Fernet, ``services/crypto.py``);
    we refuse to store it in the clear, so 2FA needs ``TOKEN_ENCRYPTION_KEY``.

    A row exists in two states: *pending* (``enabled`` false) once a secret has
    been generated but the user hasn't yet proven possession with a code, and
    *active* (``enabled`` true) after confirmation. ``require_for_login`` /
    ``require_for_delete`` are the user's chosen enforcement points.
    """

    __tablename__ = "two_factor"
    __table_args__ = (UniqueConstraint("owner_id", name="uq_two_factor_owner"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    secret_enc: Mapped[str] = mapped_column(Text, nullable=False)
    enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    require_for_login: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    require_for_delete: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    # bcrypt hashes of unused one-time recovery codes (shown once at enrollment);
    # consuming a code removes its hash from the list.
    recovery_codes: Mapped[list] = mapped_column(
        JSONVariant, nullable=False, default=list
    )
    # Lightweight brute-force throttle on code verification.
    failed_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0, server_default="0"
    )
    locked_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    confirmed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Domain(Base):
    """A user's custom domain (the sidebar categories). Items reference a domain
    by name (items.domain text); this table is the per-user registry so a domain
    can exist even before it has any items."""

    __tablename__ = "domains"
    __table_args__ = (
        UniqueConstraint("owner_id", "name", name="uq_domains_owner_name"),
        Index("ix_domains_owner", "owner_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
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
        Index("ix_items_owner_start", "owner_id", "start_at"),
        Index("ix_items_owner_deadline", "owner_id", "deadline"),
        # One mirrored row per external event (per owner). Partial so the many
        # local items (external_id NULL) are exempt from the uniqueness check.
        Index(
            "uq_items_owner_external",
            "owner_id",
            "source",
            "external_id",
            unique=True,
            postgresql_where=text("external_id IS NOT NULL"),
            sqlite_where=text("external_id IS NOT NULL"),
        ),
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
    # Seeded first-run tutorial item. Its checkpoint never counts as the user's
    # own (first-checkpoint reveal), it stays out of the sidebar domain list,
    # and the client styles/dismisses it specially.
    is_tutorial: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    procedure: Mapped[str | None] = mapped_column(Text, nullable=True)  # known|unknown
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)  # bounded|unbounded
    # Time fields. ``start_at``/``end_at`` carry an event's span or a task's
    # planned start; ``deadline`` is a task's due date/time (events leave it
    # NULL). ``all_day`` marks a date-only span. These drive the Today/Ready
    # date windows (services/items.py surfacing) — see GOOGLE_CALENDAR_INTEGRATION.md.
    start_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    end_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    all_day: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    # Provenance. 'local' = user-authored (fully user-owned). 'gcal' = mirrored
    # from Google Calendar (read-only sync): Google owns title/time, the user
    # owns the work (checkpoints, daily, compile, domain). The reconciler keeps
    # that split — see calendar_sync.py (Phase 2). external_* are NULL for local.
    source: Mapped[str] = mapped_column(
        Text, nullable=False, default="local", server_default="local"
    )
    external_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_etag: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    # When the item was moved to trash (state set to "killed"). NULL = not trashed.
    # Trash is auto-purged 30 days after this timestamp; the pre-trash state is
    # stashed in fields["prevState"] so a restore returns it where it came from.
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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


class CalendarConnection(Base):
    """A user's connected Google Calendar (read-only mirror). One per user (v1).

    Holds the OAuth tokens (encrypted at rest), the incremental ``sync_token``,
    and the calendar's ``time_zone`` (used to compute the user's "today"). The
    refresh token is the durable secret; the access token is a short-lived
    cache. ``status`` flips to ``reauth_required`` when Google rejects the
    refresh token (the user revoked access) so the client can prompt a reconnect.
    """

    __tablename__ = "calendar_connections"
    __table_args__ = (
        UniqueConstraint("owner_id", name="uq_calendar_connections_owner"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # which Google account the calendar belongs to (may differ from sign-in)
    google_sub: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_email: Mapped[str | None] = mapped_column(Text, nullable=True)
    refresh_token_enc: Mapped[str] = mapped_column(Text, nullable=False)
    access_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    access_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    scope: Mapped[str | None] = mapped_column(Text, nullable=True)
    calendar_id: Mapped[str] = mapped_column(
        Text, nullable=False, default="primary", server_default="primary"
    )
    time_zone: Mapped[str | None] = mapped_column(Text, nullable=True)
    sync_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        Text, nullable=False, default="active", server_default="active"
    )
    last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
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


class Snapshot(Base):
    """Freeform context the user attaches to an item: a note and/or a link,
    kept with the task so it persists across sessions.

    Unlike a Checkpoint (the mandatory session receipt), a snapshot is optional
    scratch material the user collects for themselves. File attachments are a
    planned extension — add ``file_*`` columns alongside ``note``/``url`` then.
    """

    __tablename__ = "snapshots"
    __table_args__ = (Index("ix_snapshots_item", "item_id", "created_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    item_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("items.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str | None] = mapped_column(Text, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
