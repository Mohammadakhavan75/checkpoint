"""Integration tests exercising the REST API through the ASGI app."""
from __future__ import annotations


async def test_capture_direct_into_domain_registers_it(client):
    # Fast Task Domain: capture straight into a (new) domain, skipping the reservoir.
    r = await client.post(
        "/api/items/capture", json={"text": "fast task", "domain": "Launch"}
    )
    assert r.status_code == 201
    item = r.json()
    assert item["domain"] == "Launch"
    assert item["state"] == "needsdef"
    iid = item["id"]

    # it is NOT in the reservoir...
    r = await client.get("/api/items", params={"tab": "reservoir"})
    assert not any(i["id"] == iid for i in r.json())

    # ...it is in the domain backlog, and the domain was auto-registered.
    r = await client.get("/api/items", params={"tab": "domain", "domain": "Launch"})
    assert any(i["id"] == iid for i in r.json())
    r = await client.get("/api/domains")
    assert any(d["name"] == "Launch" for d in r.json())


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


async def test_done_checkpoint_needs_no_resume_fields(client):
    r = await client.post("/api/items", json={"title": "work", "domain": "DDWS", "state": "active"})
    iid = r.json()["id"]

    # non-done outcomes still require the resume fields
    r = await client.post(
        f"/api/items/{iid}/checkpoints",
        json={"outcome": "active", "last_state": "midway"},
    )
    assert r.status_code == 422

    # done has no next step — last_state alone is enough
    r = await client.post(
        f"/api/items/{iid}/checkpoints",
        json={"outcome": "done", "last_state": "shipped"},
    )
    assert r.status_code == 201
    body = r.json()
    assert body["next_action"] == ""
    assert body["resume_from"] == ""

    r = await client.get(f"/api/items/{iid}")
    assert r.json()["state"] == "done"


async def test_scout_state_and_scout_mode_cannot_contradict(client):
    # creating with scout state forces Scout mode
    r = await client.post(
        "/api/items",
        json={"title": "recon", "domain": "DDWS", "state": "scout", "mode": "Do"},
    )
    body = r.json()
    assert body["mode"] == "Scout"
    iid = body["id"]

    # setting a Scout-mode item to active means scouting, not executing
    r = await client.post(f"/api/items/{iid}/state", json={"state": "active"})
    assert r.json()["state"] == "scout"

    # compiling to a known|bounded procedure ends scouting
    r = await client.post(
        f"/api/items/{iid}/compile",
        json={"procedure": "known", "scope": "bounded", "firstAction": "step 1"},
    )
    body = r.json()
    assert body["mode"] == "Do"
    assert body["state"] == "active"

    # and re-classifying as unknown sends an active item back to scouting
    r = await client.post(
        f"/api/items/{iid}/compile",
        json={"procedure": "unknown", "scope": "bounded"},
    )
    body = r.json()
    assert body["mode"] == "Scout"
    assert body["state"] == "scout"


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


async def test_snapshot_create_list_delete(client):
    r = await client.post("/api/items", json={"title": "work", "domain": "DDWS", "state": "active"})
    iid = r.json()["id"]

    # empty snapshot (no note) -> 422
    r = await client.post(f"/api/items/{iid}/snapshots", json={"note": "  "})
    assert r.status_code == 422

    # note-only snapshot
    r = await client.post(f"/api/items/{iid}/snapshots", json={"note": "remember this"})
    assert r.status_code == 201
    assert r.json()["note"] == "remember this"
    sid1 = r.json()["id"]

    # snapshot with title and note
    r = await client.post(
        f"/api/items/{iid}/snapshots",
        json={"title": "spec", "note": "look at README"},
    )
    assert r.status_code == 201
    sid2 = r.json()["id"]
    assert r.json()["title"] == "spec"
    assert r.json()["note"] == "look at README"

    # both are listed, scoped to the item
    r = await client.get(f"/api/items/{iid}/snapshots")
    assert r.status_code == 200
    rows = r.json()
    assert len(rows) == 2
    assert {row["note"] for row in rows} == {"remember this", "look at README"}

    # patch/update snapshot note
    r = await client.patch(
        f"/api/items/{iid}/snapshots/{sid1}",
        json={"note": "remember this updated"},
    )
    assert r.status_code == 200
    assert r.json()["note"] == "remember this" + " updated"

    # patch snapshot with empty note -> 422
    r = await client.patch(
        f"/api/items/{iid}/snapshots/{sid1}",
        json={"note": "  "},
    )
    assert r.status_code == 422

    # delete one
    r = await client.delete(f"/api/items/{iid}/snapshots/{sid2}")
    assert r.status_code == 204
    r = await client.get(f"/api/items/{iid}/snapshots")
    remaining = r.json()
    assert len(remaining) == 1
    assert remaining[0]["note"] == "remember this updated"


async def test_snapshot_unknown_item_404(client):
    import uuid

    missing = uuid.uuid4()
    r = await client.get(f"/api/items/{missing}/snapshots")
    assert r.status_code == 404
    r = await client.post(f"/api/items/{missing}/snapshots", json={"note": "x"})
    assert r.status_code == 404


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
