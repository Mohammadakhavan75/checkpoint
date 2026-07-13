"""Personal access tokens: mint, authenticate, revoke (agent API auth).

The raw token is `ckpt_pat_` + 43 chars of urlsafe randomness, shown exactly
once at mint. Only its SHA-256 hex lands in the database, so a DB leak never
leaks usable credentials. Lookup is by hash (indexed, unique).
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import PersonalAccessToken, User

TOKEN_PREFIX = "ckpt_pat_"
# prefix + 4 chars — enough to recognise a token in `list`, useless to guess.
_DISPLAY_LEN = len(TOKEN_PREFIX) + 4


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _aware(dt: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes even for timezone=True columns; normalise
    to UTC so comparisons never raise."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def create_pat(
    session: AsyncSession,
    owner_id: uuid.UUID,
    name: str,
    expires_days: int | None = 90,
) -> tuple[str, PersonalAccessToken]:
    """Mint a token. Returns (raw_token, row); the raw token is not recoverable."""
    raw = TOKEN_PREFIX + secrets.token_urlsafe(32)
    pat = PersonalAccessToken(
        owner_id=owner_id,
        name=name,
        token_hash=_hash(raw),
        token_prefix=raw[:_DISPLAY_LEN],
        expires_at=(
            datetime.now(timezone.utc) + timedelta(days=expires_days)
            if expires_days
            else None
        ),
    )
    session.add(pat)
    await session.flush()
    return raw, pat


async def authenticate_pat(session: AsyncSession, raw: str) -> User | None:
    """Resolve a raw bearer token to its owner, or None.

    None for: wrong prefix, unknown hash, revoked, expired. On success stamps
    ``last_used_at`` and commits (the app sessionmaker uses
    ``expire_on_commit=False``, so returned ORM objects stay usable).
    """
    if not raw or not raw.startswith(TOKEN_PREFIX):
        return None
    result = await session.execute(
        select(PersonalAccessToken).where(
            PersonalAccessToken.token_hash == _hash(raw)
        )
    )
    pat = result.scalar_one_or_none()
    if pat is None or pat.revoked_at is not None:
        return None
    now = datetime.now(timezone.utc)
    expires_at = _aware(pat.expires_at)
    if expires_at is not None and expires_at <= now:
        return None
    pat.last_used_at = now
    await session.commit()
    return await session.get(User, pat.owner_id)


async def list_pats(
    session: AsyncSession, owner_id: uuid.UUID
) -> list[PersonalAccessToken]:
    result = await session.execute(
        select(PersonalAccessToken)
        .where(PersonalAccessToken.owner_id == owner_id)
        .order_by(PersonalAccessToken.created_at.desc())
    )
    return list(result.scalars().all())


async def revoke_pat(
    session: AsyncSession, owner_id: uuid.UUID, token_prefix: str
) -> int:
    """Revoke every live token of this owner whose display prefix matches.
    Returns the number revoked."""
    result = await session.execute(
        select(PersonalAccessToken).where(
            PersonalAccessToken.owner_id == owner_id,
            PersonalAccessToken.token_prefix == token_prefix,
            PersonalAccessToken.revoked_at.is_(None),
        )
    )
    rows = list(result.scalars().all())
    now = datetime.now(timezone.utc)
    for row in rows:
        row.revoked_at = now
    await session.flush()
    return len(rows)
