"""Auth endpoints: register, login, me."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from ..auth import create_access_token, get_current_user, hash_password, verify_password
from ..config import settings
from ..db import get_session
from ..models import User
from ..schemas import (
    GoogleLoginRequest,
    LoginRequest,
    SeenVersionRequest,
    Token,
    UserCreate,
    UserOut,
)
from ..services.google_auth import (
    GoogleAuthError,
    get_or_link_google_user,
    verify_google_credential,
)

router = APIRouter()


@router.get("/providers")
async def providers() -> dict[str, bool]:
    """Which sign-in methods are available (lets the client show the Google button)."""
    return {"password": True, "google": bool(settings.google_client_id)}


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate, session: AsyncSession = Depends(get_session)
) -> UserOut:
    existing = await session.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email, hashed_password=hash_password(payload.password)
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return UserOut.model_validate(user)


@router.post("/login", response_model=Token)
async def login(
    payload: LoginRequest, session: AsyncSession = Depends(get_session)
) -> Token:
    result = await session.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return Token(access_token=create_access_token(str(user.id)))


@router.post("/google", response_model=Token)
async def google_login(
    payload: GoogleLoginRequest, session: AsyncSession = Depends(get_session)
) -> Token:
    if not settings.google_client_id:
        raise HTTPException(status_code=503, detail="Google sign-in is not configured")
    try:
        claims = await run_in_threadpool(verify_google_credential, payload.credential)
    except GoogleAuthError:
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = claims.get("email")
    google_sub = claims.get("sub")
    if not email or not google_sub:
        raise HTTPException(status_code=401, detail="Google credential missing email")
    if claims.get("email_verified") is False:
        raise HTTPException(status_code=401, detail="Google email is not verified")

    user = await get_or_link_google_user(
        session,
        email=email,
        google_sub=google_sub,
        name=claims.get("name"),
        picture=claims.get("picture"),
    )
    await session.commit()
    return Token(access_token=create_access_token(str(user.id)))


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(user)


@router.post("/seen", status_code=status.HTTP_204_NO_CONTENT)
async def mark_seen_version(
    payload: SeenVersionRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Record the app version this user has now seen release notes for."""
    user.last_seen_version = payload.version
    await session.commit()
