"""Google sign-in: new-account creation and email-based account linking."""
from __future__ import annotations

import app.api.auth as auth_api
from app.auth import hash_password
from app.config import settings
from app.models import User
from sqlalchemy import select


def _patch_google(monkeypatch, email: str, sub: str, verified: bool = True):
    monkeypatch.setattr(settings, "google_client_id", "test-client-id")
    monkeypatch.setattr(
        auth_api,
        "verify_google_credential",
        lambda credential: {"email": email, "sub": sub, "email_verified": verified},
    )


async def test_google_login_creates_new_account(client, monkeypatch, sessionmaker_):
    _patch_google(monkeypatch, "newgoogle@example.com", "google-sub-1")
    r = await client.post("/api/auth/google", json={"credential": "tok"})
    assert r.status_code == 200
    assert "access_token" in r.json()

    async with sessionmaker_() as s:
        user = (
            await s.execute(select(User).where(User.email == "newgoogle@example.com"))
        ).scalar_one()
        assert user.google_sub == "google-sub-1"
        assert user.hashed_password is None


async def test_google_login_links_existing_password_account(
    client, monkeypatch, sessionmaker_
):
    # pre-existing email/password account
    async with sessionmaker_() as s:
        s.add(
            User(email="linkme@example.com", hashed_password=hash_password("pw123456"))
        )
        await s.commit()

    _patch_google(monkeypatch, "linkme@example.com", "google-sub-2")
    r = await client.post("/api/auth/google", json={"credential": "tok"})
    assert r.status_code == 200

    async with sessionmaker_() as s:
        users = (
            await s.execute(select(User).where(User.email == "linkme@example.com"))
        ).scalars().all()
        assert len(users) == 1  # linked, not duplicated
        assert users[0].google_sub == "google-sub-2"
        assert users[0].hashed_password is not None  # password still works too


async def test_google_login_idempotent_by_sub(client, monkeypatch, sessionmaker_):
    _patch_google(monkeypatch, "repeat@example.com", "google-sub-3")
    await client.post("/api/auth/google", json={"credential": "tok"})
    await client.post("/api/auth/google", json={"credential": "tok"})

    async with sessionmaker_() as s:
        users = (
            await s.execute(select(User).where(User.email == "repeat@example.com"))
        ).scalars().all()
        assert len(users) == 1


async def test_google_login_disabled_returns_503(client, monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", "")
    r = await client.post("/api/auth/google", json={"credential": "tok"})
    assert r.status_code == 503


async def test_password_login_on_google_only_account_says_use_google(
    client, monkeypatch
):
    _patch_google(monkeypatch, "gonly@example.com", "google-sub-4")
    await client.post("/api/auth/google", json={"credential": "tok"})

    r = await client.post(
        "/api/auth/login", json={"email": "gonly@example.com", "password": "whatever1"}
    )
    assert r.status_code == 401
    assert "signs in with Google" in r.json()["detail"]


async def test_register_on_google_only_account_says_use_google(client, monkeypatch):
    _patch_google(monkeypatch, "greg@example.com", "google-sub-5")
    await client.post("/api/auth/google", json={"credential": "tok"})

    r = await client.post(
        "/api/auth/register", json={"email": "greg@example.com", "password": "pw123456"}
    )
    assert r.status_code == 400
    assert "Google" in r.json()["detail"]


async def test_google_only_account_can_set_password_then_login(auth_client, monkeypatch):
    _patch_google(monkeypatch, "setpw@example.com", "google-sub-6")
    r = await auth_client.post("/api/auth/google", json={"credential": "tok"})
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    r = await auth_client.get("/api/auth/me", headers=headers)
    assert r.json()["has_password"] is False

    r = await auth_client.post(
        "/api/auth/password", json={"password": "newpw123"}, headers=headers
    )
    assert r.status_code == 204

    r = await auth_client.get("/api/auth/me", headers=headers)
    assert r.json()["has_password"] is True

    r = await auth_client.post(
        "/api/auth/login", json={"email": "setpw@example.com", "password": "newpw123"}
    )
    assert r.status_code == 200
    assert "access_token" in r.json()


async def test_change_password_requires_current_password(auth_client, monkeypatch):
    _patch_google(monkeypatch, "chpw@example.com", "google-sub-7")
    r = await auth_client.post("/api/auth/google", json={"credential": "tok"})
    headers = {"Authorization": f"Bearer {r.json()['access_token']}"}
    await auth_client.post(
        "/api/auth/password", json={"password": "first123"}, headers=headers
    )

    # change without / with wrong current password -> rejected
    r = await auth_client.post(
        "/api/auth/password", json={"password": "second123"}, headers=headers
    )
    assert r.status_code == 400
    r = await auth_client.post(
        "/api/auth/password",
        json={"password": "second123", "current_password": "wrong999"},
        headers=headers,
    )
    assert r.status_code == 400

    # correct current password -> changed
    r = await auth_client.post(
        "/api/auth/password",
        json={"password": "second123", "current_password": "first123"},
        headers=headers,
    )
    assert r.status_code == 204
    r = await auth_client.post(
        "/api/auth/login", json={"email": "chpw@example.com", "password": "second123"}
    )
    assert r.status_code == 200


async def test_register_case_variant_email_is_rejected_not_duplicated(
    client, monkeypatch, sessionmaker_
):
    _patch_google(monkeypatch, "case@example.com", "google-sub-8")
    await client.post("/api/auth/google", json={"credential": "tok"})

    r = await client.post(
        "/api/auth/register", json={"email": "Case@Example.com", "password": "pw123456"}
    )
    assert r.status_code == 400

    async with sessionmaker_() as s:
        users = (
            await s.execute(
                select(User).where(User.email.ilike("case@example.com"))
            )
        ).scalars().all()
        assert len(users) == 1


async def test_google_unreachable_returns_503_not_401(client, monkeypatch):
    # cert fetch failed — the credential may be fine, so this must not be a 401
    from app.services.google_auth import GoogleAuthUnavailableError

    monkeypatch.setattr(settings, "google_client_id", "test-client-id")

    def unavailable(credential):
        raise GoogleAuthUnavailableError("Google sign-in is temporarily unavailable")

    monkeypatch.setattr(auth_api, "verify_google_credential", unavailable)
    r = await client.post("/api/auth/google", json={"credential": "tok"})
    assert r.status_code == 503
    assert "temporarily unavailable" in r.json()["detail"]
