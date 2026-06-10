"""Test fixtures: an in-memory SQLite DB and an ASGI client with overrides."""
from __future__ import annotations

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.auth import get_current_user, hash_password
from app.db import get_session
from app.main import app
from app.models import Base, User


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(
        "sqlite+aiosqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(eng.sync_engine, "connect")
    def _fk_pragma(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def sessionmaker_(engine):
    return async_sessionmaker(engine, expire_on_commit=False)


@pytest_asyncio.fixture
async def session(sessionmaker_):
    async with sessionmaker_() as s:
        yield s


@pytest_asyncio.fixture
async def user(sessionmaker_):
    async with sessionmaker_() as s:
        u = User(email="t@example.com", hashed_password=hash_password("password"))
        s.add(u)
        await s.commit()
        await s.refresh(u)
    return u


@pytest_asyncio.fixture
async def auth_client(sessionmaker_):
    """Like `client`, but without the get_current_user override — exercises the
    real bearer-token path for tests about authentication itself."""

    async def override_session():
        async with sessionmaker_() as s:
            try:
                yield s
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_session] = override_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(sessionmaker_, user):
    async def override_session():
        async with sessionmaker_() as s:
            try:
                yield s
            except Exception:
                await s.rollback()
                raise

    app.dependency_overrides[get_session] = override_session
    app.dependency_overrides[get_current_user] = lambda: user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

    app.dependency_overrides.clear()
