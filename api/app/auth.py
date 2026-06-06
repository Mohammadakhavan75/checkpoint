"""JWT auth: password hashing, token creation, current-user dependency."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from .db import get_session
from .models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")

# bcrypt only considers the first 72 bytes and (>=4.1) raises on longer input,
# so we truncate explicitly. We use the bcrypt library directly because passlib
# is unmaintained and incompatible with current bcrypt / Python 3.14.
_BCRYPT_MAX = 72


def hash_password(password: str) -> str:
    secret = password.encode("utf-8")[:_BCRYPT_MAX]
    return bcrypt.hashpw(secret, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str | None) -> bool:
    if not hashed:  # Google-only account, no local password set
        return False
    secret = password.encode("utf-8")[:_BCRYPT_MAX]
    try:
        return bcrypt.checkpw(secret, hashed.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(subject: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> User:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        subject = payload.get("sub")
        if not subject:
            raise credentials_exc
        user_id = uuid.UUID(subject)
    except (jwt.PyJWTError, ValueError):
        raise credentials_exc

    user = await session.get(User, user_id)
    if user is None:
        raise credentials_exc
    return user
