"""Google sign-in: verify an ID token and link/create the matching user.

Account linking rule: if a user with the token's email already exists (e.g. they
signed up with email/password), we attach the Google subject id to that account so
they can sign in either way. Otherwise we create a new password-less account.
"""
from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import User

logger = logging.getLogger(__name__)


class GoogleAuthError(Exception):
    """Raised when a Google credential cannot be verified."""


class GoogleAuthUnavailableError(GoogleAuthError):
    """Raised when Google can't be reached to verify a credential.

    The credential may be perfectly valid — distinguishing this from a bad
    token lets the API answer 503 instead of a misleading 401.
    """


_transport = None


def _google_transport():
    """Shared HTTP transport for cert fetches, built lazily like the imports.

    Google's signing certs ship with cache headers (hours of freshness);
    CacheControl honors them, so most verifications never touch the network
    and a warm cache rides out brief egress outages.
    """
    global _transport
    if _transport is None:
        import cachecontrol
        import requests
        from google.auth.transport import requests as google_requests

        _transport = google_requests.Request(
            session=cachecontrol.CacheControl(requests.Session())
        )
    return _transport


def verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token and return its claims.

    Imported lazily so the rest of the app (and tests) don't require google-auth
    unless Google sign-in is actually used. Tests monkeypatch this function.
    """
    if not settings.google_client_id:
        raise GoogleAuthError("Google sign-in is not configured")
    try:
        from google.oauth2 import id_token as google_id_token

        return google_id_token.verify_oauth2_token(
            credential,
            _google_transport(),
            settings.google_client_id,
            # tolerate small container/host clock drift
            clock_skew_in_seconds=10,
        )
    except GoogleAuthError:
        raise
    except Exception as exc:  # noqa: BLE001 - normalize any verification failure
        import requests
        from google.auth.exceptions import TransportError

        if isinstance(exc, (TransportError, requests.RequestException)):
            logger.warning("Google cert fetch failed: %s", exc)
            raise GoogleAuthUnavailableError(
                "Google sign-in is temporarily unavailable"
            ) from exc
        # Log the real reason (e.g. wrong audience / clock skew) for diagnosis.
        logger.warning("Google credential verification failed: %s", exc)
        raise GoogleAuthError("Invalid Google credential") from exc


async def get_or_link_google_user(
    session: AsyncSession,
    *,
    email: str,
    google_sub: str,
    name: str | None = None,
    picture: str | None = None,
) -> User:
    def apply_profile(u: User) -> None:
        # keep the display profile fresh from Google
        if name:
            u.name = name
        if picture:
            u.picture = picture

    # 1) already linked by Google subject id
    result = await session.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalar_one_or_none()
    if user is not None:
        apply_profile(user)
        return user

    # 2) same email exists (e.g. email/password account) -> link them
    # (case-insensitive: rows created before email normalization may be mixed case)
    result = await session.execute(
        select(User).where(func.lower(User.email) == email.lower())
    )
    user = result.scalar_one_or_none()
    if user is not None:
        if not user.google_sub:
            user.google_sub = google_sub
        apply_profile(user)
        return user

    # 3) brand new, password-less account
    user = User(email=email, hashed_password=None, google_sub=google_sub)
    apply_profile(user)
    session.add(user)
    await session.flush()
    # First Google sign-in is a registration: seed the first-run tutorial.
    from .tutorial import seed_tutorial  # local import avoids cycle noise

    await seed_tutorial(session, user.id)
    return user
