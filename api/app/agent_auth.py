"""PAT bearer auth for the agent API (`/api/agent/*`) — and nowhere else.

A PAT deliberately bypasses the interactive login and 2FA, so the blast radius
is bounded structurally: this dependency is used only by the agent router, and
`get_current_user` (JWT) rejects PATs because they aren't JWTs. Both directions
are covered by tests (tests/test_agent.py).
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_session
from .models import User
from .services.pats import authenticate_pat

_bearer = HTTPBearer(auto_error=False)


async def get_agent_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing agent token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise exc
    user = await authenticate_pat(session, credentials.credentials)
    if user is None:
        raise exc
    return user
