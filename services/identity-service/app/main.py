import os
import secrets
from typing import Protocol

import redis
from fastapi import Depends, FastAPI, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .database import Base, engine, get_db
from .models import Preference, User
from .schemas import (
    AuthResponse,
    LogoutRequest,
    PreferenceOut,
    PreferenceUpdate,
    RefreshRequest,
    UserCreate,
    UserLogin,
    UserOut,
)
from .security import create_access_token, hash_password, verify_password


REFRESH_TOKEN_SECONDS = int(os.getenv("REFRESH_TOKEN_SECONDS", "2592000"))
REDIS_URL = os.getenv("REDIS_URL", "memory://")


class SessionStore(Protocol):
    def setex(self, key: str, seconds: int, value: str) -> None:
        ...

    def get(self, key: str) -> str | bytes | None:
        ...

    def delete(self, key: str) -> None:
        ...


class MemorySessionStore:
    def __init__(self) -> None:
        self.values: dict[str, str] = {}

    def setex(self, key: str, seconds: int, value: str) -> None:
        self.values[key] = value

    def get(self, key: str) -> str | bytes | None:
        return self.values.get(key)

    def delete(self, key: str) -> None:
        self.values.pop(key, None)


def make_store() -> SessionStore:
    if REDIS_URL.startswith("memory://"):
        return MemorySessionStore()
    return redis.Redis.from_url(REDIS_URL, decode_responses=True)


session_store = make_store()
app = FastAPI(title="Checkpoint Identity Service")


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)


def preference_out(preference: Preference) -> PreferenceOut:
    return PreferenceOut(nav_collapsed=preference.nav_collapsed, active_limit=preference.active_limit)


def issue_tokens(user: User, db: Session) -> AuthResponse:
    if user.preferences is None:
        user.preferences = Preference(user_id=user.id)
        db.add(user.preferences)
        db.commit()
        db.refresh(user)
    refresh_token = secrets.token_urlsafe(48)
    session_store.setex(f"refresh:{refresh_token}", REFRESH_TOKEN_SECONDS, user.id)
    return AuthResponse(
        access_token=create_access_token(user.id, user.email),
        refresh_token=refresh_token,
        user=UserOut.model_validate(user),
        preferences=preference_out(user.preferences),
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup(payload: UserCreate, db: Session = Depends(get_db)) -> AuthResponse:
    email = payload.email.lower()
    user = User(email=email, password_hash=hash_password(payload.password))
    user.preferences = Preference(user_id=user.id)
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Email already exists") from exc
    db.refresh(user)
    return issue_tokens(user, db)


@app.post("/auth/login", response_model=AuthResponse)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email.lower()))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return issue_tokens(user, db)


@app.post("/auth/refresh", response_model=AuthResponse)
def refresh(payload: RefreshRequest, db: Session = Depends(get_db)) -> AuthResponse:
    stored_user_id = session_store.get(f"refresh:{payload.refresh_token}")
    if isinstance(stored_user_id, bytes):
        stored_user_id = stored_user_id.decode("utf-8")
    if not stored_user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh session")
    session_store.delete(f"refresh:{payload.refresh_token}")
    user = db.get(User, stored_user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid refresh session")
    return issue_tokens(user, db)


@app.post("/auth/logout")
def logout(payload: LogoutRequest) -> dict[str, bool]:
    if payload.refresh_token:
        session_store.delete(f"refresh:{payload.refresh_token}")
    return {"ok": True}


@app.get("/users/{user_id}", response_model=UserOut)
def get_user(user_id: str, db: Session = Depends(get_db)) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user)


@app.get("/users/{user_id}/preferences", response_model=PreferenceOut)
def get_preferences(user_id: str, db: Session = Depends(get_db)) -> PreferenceOut:
    preference = db.get(Preference, user_id)
    if preference is None:
        user = db.get(User, user_id)
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        preference = Preference(user_id=user_id)
        db.add(preference)
        db.commit()
        db.refresh(preference)
    return preference_out(preference)


@app.patch("/users/{user_id}/preferences", response_model=PreferenceOut)
def update_preferences(user_id: str, payload: PreferenceUpdate, db: Session = Depends(get_db)) -> PreferenceOut:
    preference = db.get(Preference, user_id)
    if preference is None:
        if db.get(User, user_id) is None:
            raise HTTPException(status_code=404, detail="User not found")
        preference = Preference(user_id=user_id)
        db.add(preference)
    if payload.nav_collapsed is not None:
        preference.nav_collapsed = payload.nav_collapsed
    if payload.active_limit is not None:
        preference.active_limit = payload.active_limit
    db.commit()
    db.refresh(preference)
    return preference_out(preference)


@app.get("/internal/resolve-user")
def resolve_user(x_user_id: str = Header(alias="X-User-Id"), db: Session = Depends(get_db)) -> UserOut:
    user = db.get(User, x_user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut.model_validate(user)
