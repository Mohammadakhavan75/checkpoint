"""Two-factor (TOTP) settings: enrollment, verification, recovery codes.

The pure OTP math lives in ``services/totp.py``; this module is the database
side — reading/creating the per-user row, encrypting the secret at rest, issuing
and consuming one-time recovery codes, and a small throttle that locks code
verification after repeated failures (an online brute-force guard, since the
codespace is only a million values).
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import hash_password, verify_password
from ..models import TwoFactorSettings
from . import totp
from .crypto import decrypt, encrypt

RECOVERY_CODE_COUNT = 10
# Throttle: after this many failed code checks, verification is locked for a
# short cooldown. Bounds an online guessing attack without a shared rate limiter.
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_SECONDS = 30


class TwoFactorLocked(Exception):
    """Verification is temporarily locked after too many failed attempts."""


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime | None) -> datetime | None:
    """SQLite round-trips datetimes as naive; treat those as UTC for comparison."""
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


async def get_settings(
    session: AsyncSession, owner_id: uuid.UUID
) -> TwoFactorSettings | None:
    result = await session.execute(
        select(TwoFactorSettings).where(TwoFactorSettings.owner_id == owner_id)
    )
    return result.scalar_one_or_none()


async def get_enabled(
    session: AsyncSession, owner_id: uuid.UUID
) -> TwoFactorSettings | None:
    """The active (confirmed) settings, or None — pending enrollments don't count."""
    row = await get_settings(session, owner_id)
    return row if row is not None and row.enabled else None


async def begin_enrollment(
    session: AsyncSession, owner_id: uuid.UUID, account: str
) -> tuple[TwoFactorSettings, str, str]:
    """Create or replace a *pending* secret and return it with its QR.

    Re-running before confirmation rotates the secret (the previous pending one
    was never trusted). The row stays ``enabled=False`` until a code confirms it.
    Returns ``(row, secret, otpauth_uri)``.
    """
    secret = totp.generate_secret()
    row = await get_settings(session, owner_id)
    if row is None:
        row = TwoFactorSettings(owner_id=owner_id, secret_enc=encrypt(secret))
        session.add(row)
    else:
        row.secret_enc = encrypt(secret)
        row.enabled = False
        row.recovery_codes = []
        row.failed_attempts = 0
        row.locked_until = None
        row.confirmed_at = None
    uri = totp.provisioning_uri(secret, account)
    return row, secret, uri


def _generate_recovery_codes() -> tuple[list[str], list[str]]:
    """Return ``(plaintext_codes, hashes)``. Plaintext is shown once, never stored."""
    plaintext = [f"{secrets.token_hex(3)}-{secrets.token_hex(3)}" for _ in range(RECOVERY_CODE_COUNT)]
    return plaintext, [hash_password(code) for code in plaintext]


def confirm_enrollment(
    row: TwoFactorSettings,
    *,
    require_for_login: bool,
    require_for_delete: bool,
) -> list[str]:
    """Activate a pending row and mint fresh recovery codes (plaintext returned)."""
    plaintext, hashes = _generate_recovery_codes()
    row.enabled = True
    row.require_for_login = require_for_login
    row.require_for_delete = require_for_delete
    row.recovery_codes = hashes
    row.failed_attempts = 0
    row.locked_until = None
    row.confirmed_at = _now()
    return plaintext


def regenerate_recovery_codes(row: TwoFactorSettings) -> list[str]:
    plaintext, hashes = _generate_recovery_codes()
    row.recovery_codes = hashes
    return plaintext


def current_secret(row: TwoFactorSettings) -> str:
    return decrypt(row.secret_enc)


def _consume_recovery_code(row: TwoFactorSettings, code: str) -> bool:
    """True (and removes the hash) if ``code`` matches an unused recovery code."""
    normalized = (code or "").strip().lower()
    for hashed in list(row.recovery_codes):
        if verify_password(normalized, hashed):
            row.recovery_codes = [h for h in row.recovery_codes if h != hashed]
            return True
    return False


def verify_code(row: TwoFactorSettings, code: str) -> bool:
    """Check ``code`` (a TOTP digit-code or a one-time recovery code), applying
    the failed-attempt throttle. Raises ``TwoFactorLocked`` while locked.

    Mutates ``row`` (attempt counter / lockout / consumed recovery code); the
    caller commits.
    """
    locked_until = _aware(row.locked_until)
    if locked_until is not None and locked_until > _now():
        raise TwoFactorLocked()

    ok = totp.verify(current_secret(row), code) or _consume_recovery_code(row, code)
    if ok:
        row.failed_attempts = 0
        row.locked_until = None
        return True

    row.failed_attempts = (row.failed_attempts or 0) + 1
    if row.failed_attempts >= MAX_FAILED_ATTEMPTS:
        row.failed_attempts = 0
        row.locked_until = _now() + timedelta(seconds=LOCKOUT_SECONDS)
    return False
