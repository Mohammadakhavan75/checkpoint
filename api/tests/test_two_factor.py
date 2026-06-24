"""Two-factor (TOTP) enrollment, login challenge, and delete-account gating."""
from __future__ import annotations

import time

import pytest
import pytest_asyncio
from cryptography.fernet import Fernet

from app.config import settings
from app.services import totp
from app.services.crypto import _fernet


def code_for(secret: str, *, offset: int = 0) -> str:
    """The valid TOTP digit-code for ``secret`` at the current step (+offset)."""
    counter = int(time.time() // totp.PERIOD) + offset
    return totp._code_at(secret, counter)


@pytest_asyncio.fixture(autouse=True)
def encryption_key(monkeypatch):
    """2FA needs an at-rest encryption key; provide one and reset the Fernet cache."""
    monkeypatch.setattr(settings, "token_encryption_key", Fernet.generate_key().decode())
    _fernet.cache_clear()
    yield
    _fernet.cache_clear()


# ----- the pure TOTP primitive -----
def test_totp_verify_accepts_current_and_adjacent_steps():
    secret = totp.generate_secret()
    assert totp.verify(secret, code_for(secret))
    assert totp.verify(secret, code_for(secret, offset=-1))  # clock skew tolerance
    assert totp.verify(secret, code_for(secret, offset=1))


def test_totp_verify_rejects_wrong_and_malformed_codes():
    secret = totp.generate_secret()
    assert not totp.verify(secret, "000000")
    assert not totp.verify(secret, "12345")  # too short
    assert not totp.verify(secret, "abcdef")
    assert not totp.verify(secret, code_for(secret, offset=5))  # outside the window


def test_provisioning_uri_is_otpauth_with_issuer():
    uri = totp.provisioning_uri("ABCDEF", "user@example.com")
    assert uri.startswith("otpauth://totp/Checkpoint:user%40example.com?")
    assert "secret=ABCDEF" in uri and "issuer=Checkpoint" in uri


# ----- enrollment flow over the API -----
async def _register_login(client, email="2fa@example.com", password="secret1"):
    await client.post("/api/auth/register", json={"email": email, "password": password})
    r = await client.post("/api/auth/login", json={"email": email, "password": password})
    body = r.json()
    assert body.get("access_token")  # no 2FA yet
    return body["access_token"], email, password


async def _enroll(client, headers, *, login=True, delete=True):
    r = await client.post("/api/auth/2fa/setup", headers=headers)
    assert r.status_code == 200, r.text
    secret = r.json()["secret"]
    assert r.json()["qr_svg"].startswith("data:image/svg+xml")
    r = await client.post(
        "/api/auth/2fa/enable",
        json={
            "code": code_for(secret),
            "require_for_login": login,
            "require_for_delete": delete,
        },
        headers=headers,
    )
    assert r.status_code == 200, r.text
    codes = r.json()["recovery_codes"]
    assert len(codes) == 10
    return secret, codes


async def test_providers_reports_two_factor_available(auth_client):
    r = await auth_client.get("/api/auth/providers")
    assert r.json()["two_factor"] is True


async def test_enable_requires_a_valid_code(auth_client):
    token, *_ = await _register_login(auth_client)
    headers = {"Authorization": f"Bearer {token}"}
    r = await auth_client.post("/api/auth/2fa/setup", headers=headers)
    secret = r.json()["secret"]
    r = await auth_client.post(
        "/api/auth/2fa/enable", json={"code": "000000"}, headers=headers
    )
    assert r.status_code == 400
    # nothing enabled
    r = await auth_client.get("/api/auth/2fa", headers=headers)
    assert r.json()["enabled"] is False and r.json()["pending"] is True


async def test_enable_requires_at_least_one_scope(auth_client):
    token, *_ = await _register_login(auth_client)
    headers = {"Authorization": f"Bearer {token}"}
    r = await auth_client.post("/api/auth/2fa/setup", headers=headers)
    secret = r.json()["secret"]
    r = await auth_client.post(
        "/api/auth/2fa/enable",
        json={
            "code": code_for(secret),
            "require_for_login": False,
            "require_for_delete": False,
        },
        headers=headers,
    )
    assert r.status_code == 422


async def test_me_reports_enforcement_flags(auth_client):
    token, *_ = await _register_login(auth_client)
    headers = {"Authorization": f"Bearer {token}"}
    await _enroll(auth_client, headers, login=True, delete=False)
    r = await auth_client.get("/api/auth/me", headers=headers)
    me = r.json()
    assert me["two_factor_enabled"] is True
    assert me["two_factor_login"] is True
    assert me["two_factor_delete"] is False


async def test_login_requires_second_factor_when_enabled(auth_client):
    token, email, password = await _register_login(auth_client)
    headers = {"Authorization": f"Bearer {token}"}
    secret, codes = await _enroll(auth_client, headers, login=True, delete=True)

    # password alone now yields a challenge, not a session token
    r = await auth_client.post(
        "/api/auth/login", json={"email": email, "password": password}
    )
    body = r.json()
    assert body["mfa_required"] is True and body["access_token"] is None
    mfa_token = body["mfa_token"]

    # the mfa_token must not work as a bearer session token
    r = await auth_client.get(
        "/api/auth/me", headers={"Authorization": f"Bearer {mfa_token}"}
    )
    assert r.status_code == 401

    # wrong code is rejected
    r = await auth_client.post(
        "/api/auth/login/2fa", json={"mfa_token": mfa_token, "code": "000000"}
    )
    assert r.status_code == 401

    # the right code completes the login
    r = await auth_client.post(
        "/api/auth/login/2fa", json={"mfa_token": mfa_token, "code": code_for(secret)}
    )
    assert r.status_code == 200 and r.json()["access_token"]


async def test_recovery_code_completes_login_and_is_single_use(auth_client):
    token, email, password = await _register_login(auth_client)
    headers = {"Authorization": f"Bearer {token}"}
    _, codes = await _enroll(auth_client, headers, login=True, delete=True)

    async def challenge():
        r = await auth_client.post(
            "/api/auth/login", json={"email": email, "password": password}
        )
        return r.json()["mfa_token"]

    r = await auth_client.post(
        "/api/auth/login/2fa", json={"mfa_token": await challenge(), "code": codes[0]}
    )
    assert r.status_code == 200 and r.json()["access_token"]

    # the same recovery code can't be reused
    r = await auth_client.post(
        "/api/auth/login/2fa", json={"mfa_token": await challenge(), "code": codes[0]}
    )
    assert r.status_code == 401


async def test_delete_account_requires_code_when_gated(auth_client):
    token, *_ = await _register_login(auth_client, email="del2fa@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    secret, _ = await _enroll(auth_client, headers, login=False, delete=True)

    # password is right but the TOTP code is missing/wrong
    r = await auth_client.request(
        "DELETE", "/api/auth/me", json={"password": "secret1"}, headers=headers
    )
    assert r.status_code == 400
    r = await auth_client.get("/api/auth/me", headers=headers)
    assert r.status_code == 200  # still alive

    # password + valid code deletes the account
    r = await auth_client.request(
        "DELETE",
        "/api/auth/me",
        json={"password": "secret1", "code": code_for(secret)},
        headers=headers,
    )
    assert r.status_code == 204
    r = await auth_client.get("/api/auth/me", headers=headers)
    assert r.status_code == 401


async def test_disable_requires_a_code_then_clears_2fa(auth_client):
    token, email, password = await _register_login(auth_client, email="dis@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    secret, _ = await _enroll(auth_client, headers, login=True, delete=True)

    r = await auth_client.post(
        "/api/auth/2fa/disable", json={"code": "000000"}, headers=headers
    )
    assert r.status_code == 400

    r = await auth_client.post(
        "/api/auth/2fa/disable", json={"code": code_for(secret)}, headers=headers
    )
    assert r.status_code == 204

    # login is ungated again
    r = await auth_client.post(
        "/api/auth/login", json={"email": email, "password": password}
    )
    assert r.json()["access_token"] and r.json()["mfa_required"] is False


async def test_verification_locks_out_after_repeated_failures(auth_client):
    token, email, password = await _register_login(auth_client, email="lock@example.com")
    headers = {"Authorization": f"Bearer {token}"}
    await _enroll(auth_client, headers, login=True, delete=True)

    async def challenge():
        r = await auth_client.post(
            "/api/auth/login", json={"email": email, "password": password}
        )
        return r.json()["mfa_token"]

    for _ in range(5):
        r = await auth_client.post(
            "/api/auth/login/2fa", json={"mfa_token": await challenge(), "code": "000000"}
        )
        assert r.status_code == 401
    # now locked
    r = await auth_client.post(
        "/api/auth/login/2fa", json={"mfa_token": await challenge(), "code": "000000"}
    )
    assert r.status_code == 429
