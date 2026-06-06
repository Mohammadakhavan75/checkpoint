"""Integration tests exercising the REST API through the ASGI app."""
from __future__ import annotations


async def test_capture_promote_compile_ready_today_flow(client):
    r = await client.post("/api/items/capture", json={"text": "shiny idea"})
    assert r.status_code == 201
    item = r.json()
    assert item["domain"] == "reservoir"
    assert item["state"] == "idea"
    iid = item["id"]

    # appears in the reservoir view
    r = await client.get("/api/items", params={"tab": "reservoir"})
    assert any(i["id"] == iid for i in r.json())

    # promote into a domain
    r = await client.post(f"/api/items/{iid}/promote", json={"domain": "DDWS"})
    assert r.json()["domain"] == "DDWS"
    assert r.json()["state"] == "needsdef"

    # compile into a resumable unit
    r = await client.post(
        f"/api/items/{iid}/compile",
        json={"procedure": "known", "scope": "bounded", "description": "d", "firstAction": "open file"},
    )
    body = r.json()
    assert body["compiled"] is True
    assert body["mode"] == "Do"
    assert body["state"] == "active"

    # shows up in Ready
    r = await client.get("/api/items", params={"tab": "ready"})
    assert any(i["id"] == iid for i in r.json())

    # pull into Today
    r = await client.post(f"/api/items/{iid}/daily", json={"daily": True})
    assert r.json()["daily"] is True
    r = await client.get("/api/items", params={"tab": "today"})
    assert any(i["id"] == iid for i in r.json())


async def test_checkpoint_required_fields_and_history(client):
    r = await client.post("/api/items", json={"title": "work", "domain": "DDWS", "state": "active"})
    iid = r.json()["id"]

    # missing last_state -> 422
    r = await client.post(
        f"/api/items/{iid}/checkpoints",
        json={"outcome": "active", "last_state": "", "next_action": "n", "resume_from": "r"},
    )
    assert r.status_code == 422

    r = await client.post(
        f"/api/items/{iid}/checkpoints",
        json={
            "outcome": "deferred",
            "last_state": "here",
            "next_action": "next",
            "resume_from": "step 3",
        },
    )
    assert r.status_code == 201

    r = await client.get(f"/api/items/{iid}")
    body = r.json()
    assert body["state"] == "deferred"
    assert body["latest_checkpoint"]["resume_from"] == "step 3"

    r = await client.get(f"/api/items/{iid}/checkpoints")
    assert len(r.json()) == 1


async def test_compile_container_nests_phases_in_domain_view(client):
    r = await client.post("/api/items", json={"title": "cluster", "domain": "HPC", "state": "needsdef"})
    iid = r.json()["id"]

    r = await client.post(
        f"/api/items/{iid}/compile",
        json={
            "procedure": "known",
            "scope": "unbounded",
            "description": "big",
            "phases": [
                {"title": "P1", "firstAction": "a"},
                {"title": "P2", "firstAction": ""},
            ],
        },
    )
    body = r.json()
    assert body["is_parent"] is True
    assert len(body["children"]) == 2

    r = await client.get("/api/items", params={"tab": "domain", "domain": "HPC"})
    top = next(i for i in r.json() if i["id"] == iid)
    assert len(top["children"]) == 2


async def test_delete_is_soft(client):
    r = await client.post("/api/items", json={"title": "x", "domain": "DDWS"})
    iid = r.json()["id"]
    r = await client.delete(f"/api/items/{iid}")
    assert r.json()["state"] == "killed"


async def test_ai_endpoints_are_stubbed_501(client):
    r = await client.post("/api/items", json={"title": "x", "domain": "DDWS"})
    iid = r.json()["id"]
    r = await client.post(f"/api/ai/resume-summary/{iid}")
    assert r.status_code == 501
    r = await client.post("/api/ai/compile-assist")
    assert r.status_code == 501


async def test_register_and_login(client):
    r = await client.post(
        "/api/auth/register", json={"email": "new@example.com", "password": "secret1"}
    )
    assert r.status_code == 201
    r = await client.post(
        "/api/auth/login", json={"email": "new@example.com", "password": "secret1"}
    )
    assert r.status_code == 200
    assert "access_token" in r.json()
