"""Google sign-in: verify an ID token and link/create the matching user.

Account linking rule: if a user with the token's email already exists (e.g. they
signed up with email/password), we attach the Google subject id to that account so
they can sign in either way. Otherwise we create a new password-less account.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import User


class GoogleAuthError(Exception):
    """Raised when a Google credential cannot be verified."""


def verify_google_credential(credential: str) -> dict:
    """Verify a Google ID token and return its claims.

    Imported lazily so the rest of the app (and tests) don't require google-auth
    unless Google sign-in is actually used. Tests monkeypatch this function.
    """
    if not settings.google_client_id:
        raise GoogleAuthError("Google sign-in is not configured")
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token

        return google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.google_client_id
        )
    except GoogleAuthError:
        raise
    except Exception as exc:  # noqa: BLE001 - normalize any verification failure
        raise GoogleAuthError("Invalid Google credential") from exc


async def get_or_link_google_user(
    session: AsyncSession, *, email: str, google_sub: str
) -> User:
    # 1) already linked by Google subject id
    result = await session.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    # 2) same email exists (e.g. email/password account) -> link them
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is not None:
        if not user.google_sub:
            user.google_sub = google_sub
        return user

    # 3) brand new, password-less account
    user = User(email=email, hashed_password=None, google_sub=google_sub)
    session.add(user)
    await session.flush()
    return user
