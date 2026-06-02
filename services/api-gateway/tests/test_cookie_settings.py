import importlib
import sys

from fastapi.testclient import TestClient


def load_gateway(monkeypatch, *, secure: str | None = None, samesite: str | None = None, domain_name: str | None = None):
    for key in (
        "DOMAIN_NAME",
        "WEB_HOST",
        "IDENTITY_HOST",
        "CHECKPOINT_HOST",
        "WEB_PORT",
        "IDENTITY_PORT",
        "CHECKPOINT_PORT",
        "FRONTEND_ORIGIN",
        "IDENTITY_SERVICE_URL",
        "CHECKPOINT_SERVICE_URL",
    ):
        monkeypatch.delenv(key, raising=False)
    if domain_name is not None:
        monkeypatch.setenv("DOMAIN_NAME", domain_name)
    if secure is None:
        monkeypatch.delenv("COOKIE_SECURE", raising=False)
    else:
        monkeypatch.setenv("COOKIE_SECURE", secure)
    if samesite is None:
        monkeypatch.delenv("COOKIE_SAMESITE", raising=False)
    else:
        monkeypatch.setenv("COOKIE_SAMESITE", samesite)
    sys.modules.pop("app.main", None)
    return importlib.import_module("app.main")


def set_cookie_headers(response) -> list[str]:
    return [value.decode("latin-1") for name, value in response.raw_headers if name == b"set-cookie"]


def test_default_cookies_are_lax_for_local_http(monkeypatch) -> None:
    gateway = load_gateway(monkeypatch)
    response = gateway.Response()

    gateway.set_auth_cookies(response, "access", "refresh")

    headers = set_cookie_headers(response)
    assert len(headers) == 2
    assert all("httponly" in header.lower() for header in headers)
    assert all("samesite=lax" in header.lower() for header in headers)
    assert all("secure" not in header.lower() for header in headers)


def test_default_service_addresses_are_derived_from_domain(monkeypatch) -> None:
    gateway = load_gateway(monkeypatch, domain_name="infiniteai.space")

    assert gateway.FRONTEND_ORIGIN == "http://infiniteai.space:5173"
    assert gateway.IDENTITY_SERVICE_URL == "http://identity.infiniteai.space:8001"
    assert gateway.CHECKPOINT_SERVICE_URL == "http://checkpoint-service.infiniteai.space:8002"


def test_cross_site_cookies_require_secure_none(monkeypatch) -> None:
    gateway = load_gateway(monkeypatch, secure="true", samesite="none")
    response = gateway.Response()

    gateway.set_auth_cookies(response, "access", "refresh")

    headers = set_cookie_headers(response)
    assert len(headers) == 2
    assert all("secure" in header.lower() for header in headers)
    assert all("samesite=none" in header.lower() for header in headers)


def test_samesite_none_without_secure_is_rejected(monkeypatch) -> None:
    monkeypatch.setenv("COOKIE_SECURE", "false")
    monkeypatch.setenv("COOKIE_SAMESITE", "none")
    sys.modules.pop("app.main", None)

    try:
        importlib.import_module("app.main")
    except RuntimeError as exc:
        assert "COOKIE_SAMESITE=none requires COOKIE_SECURE=true" in str(exc)
    else:
        raise AssertionError("Expected insecure cross-site cookie settings to be rejected")


def test_today_state_requires_auth_and_forwards_user(monkeypatch) -> None:
    gateway = load_gateway(monkeypatch)
    calls = []

    class FakeResponse:
        status_code = 201
        text = ""

        def json(self):
            return {"state": "Avoiding"}

    async def fake_checkpoint_request(method, path, user_id, *, json=None, params=None):
        calls.append({"method": method, "path": path, "user_id": user_id, "json": json, "params": params})
        return FakeResponse()

    monkeypatch.setattr(gateway, "decode_access_token", lambda token: {"sub": "gateway-user"})
    monkeypatch.setattr(gateway, "checkpoint_request", fake_checkpoint_request)
    client = TestClient(gateway.app)

    unauthenticated = client.post("/api/today/state", json={"state": "Avoiding"})
    assert unauthenticated.status_code == 401
    assert calls == []

    authenticated = client.post("/api/today/state", cookies={"access_token": "valid"}, json={"state": "Avoiding"})
    assert authenticated.status_code == 201
    assert calls == [
        {
            "method": "POST",
            "path": "/today/state",
            "user_id": "gateway-user",
            "json": {"state": "Avoiding"},
            "params": None,
        }
    ]


def test_today_start_requires_auth_and_forwards_user(monkeypatch) -> None:
    gateway = load_gateway(monkeypatch)
    calls = []

    class FakeResponse:
        status_code = 201
        text = ""

        def json(self):
            return {"kind": "started", "message": "You broke avoidance. Momentum restored."}

    async def fake_checkpoint_request(method, path, user_id, *, json=None, params=None):
        calls.append({"method": method, "path": path, "user_id": user_id, "json": json, "params": params})
        return FakeResponse()

    monkeypatch.setattr(gateway, "decode_access_token", lambda token: {"sub": "gateway-user"})
    monkeypatch.setattr(gateway, "checkpoint_request", fake_checkpoint_request)
    client = TestClient(gateway.app)

    payload = {"mission_id": "mission-1", "state": "Locked in", "action_text": "Open draft.md"}
    unauthenticated = client.post("/api/today/start", json=payload)
    assert unauthenticated.status_code == 401
    assert calls == []

    authenticated = client.post("/api/today/start", cookies={"access_token": "valid"}, json=payload)
    assert authenticated.status_code == 201
    assert calls == [
        {
            "method": "POST",
            "path": "/today/start",
            "user_id": "gateway-user",
            "json": payload,
            "params": None,
        }
    ]
