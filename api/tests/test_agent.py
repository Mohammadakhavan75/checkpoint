"""Agent API (MCP v0) tests: PAT auth boundary, orient/get_item/checkpoint/capture."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest_asyncio
from sqlalchemy import select

from app.auth import create_access_token
from app.models import Domain, Item, User
from app.services.pats import create_pat, revoke_pat


@pytest_asyncio.fixture
async def pat(sessionmaker_, user):
    async with sessionmaker_() as s:
        raw, _ = await create_pat(s, user.id, "test-token", expires_days=90)
        await s.commit()
    return raw


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def test_orient_requires_token(auth_client):
    response = await auth_client.get("/api/agent/orient")
    assert response.status_code == 401


async def test_jwt_rejected_on_agent_route(auth_client, user):
    token = create_access_token(str(user.id))
    response = await auth_client.get("/api/agent/orient", headers=bearer(token))
    assert response.status_code == 401


async def test_pat_rejected_on_main_api(auth_client, pat):
    response = await auth_client.get("/api/items", headers=bearer(pat))
    assert response.status_code == 401


async def test_revoked_pat_rejected(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        raw2, row = await create_pat(s, user.id, "revoke-me", expires_days=90)
        await s.commit()
        await revoke_pat(s, user.id, row.token_prefix)
        await s.commit()

    response = await auth_client.get("/api/agent/orient", headers=bearer(raw2))
    assert response.status_code == 401


async def test_expired_pat_rejected(auth_client, sessionmaker_, user):
    async with sessionmaker_() as s:
        raw, row = await create_pat(s, user.id, "expiring", expires_days=90)
        await s.commit()
        result = await s.execute(
            select(type(row)).where(type(row).id == row.id)
        )
        pat_row = result.scalar_one()
        pat_row.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
        await s.commit()

    response = await auth_client.get("/api/agent/orient", headers=bearer(raw))
    assert response.status_code == 401


async def test_orient_shape_and_scoping(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        other = User(email="other-orient@example.com", hashed_password="x")
        s.add(other)
        await s.flush()

        item_a = Item(
            owner_id=user.id, title="A item", domain="Research", state="active", fields={}
        )
        item_b = Item(
            owner_id=other.id, title="B item", domain="Research", state="active", fields={}
        )
        s.add_all([item_a, item_b])
        await s.commit()

    response = await auth_client.get("/api/agent/orient", headers=bearer(pat))
    assert response.status_code == 200
    body = response.json()
    titles = [i["title"] for i in body["items"]]
    assert "A item" in titles
    assert "B item" not in titles
    assert body["protocol"]
    assert isinstance(body["domains"], list)


async def test_orient_excludes_noise(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        tutorial = Item(
            owner_id=user.id,
            title="tutorial",
            domain="Research",
            state="active",
            is_tutorial=True,
            fields={},
        )
        trashed = Item(
            owner_id=user.id,
            title="trashed",
            domain="Research",
            state="killed",
            deleted_at=datetime.now(timezone.utc),
            fields={},
        )
        idea = Item(
            owner_id=user.id, title="stray idea", domain="reservoir", state="idea", fields={}
        )
        gcal = Item(
            owner_id=user.id,
            title="gcal event",
            domain="calendar",
            state="active",
            source="gcal",
            external_id="ext-1",
            fields={},
        )
        done = Item(
            owner_id=user.id, title="done item", domain="Research", state="done", fields={}
        )
        s.add_all([tutorial, trashed, idea, gcal, done])
        await s.commit()

    response = await auth_client.get("/api/agent/orient", headers=bearer(pat))
    assert response.status_code == 200
    body = response.json()
    titles = [i["title"] for i in body["items"]]
    assert "tutorial" not in titles
    assert "trashed" not in titles
    assert "stray idea" not in titles
    assert "gcal event" not in titles
    assert "done item" not in titles
    assert body["reservoir_count"] == 1


async def test_orient_freshest_first(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        older = Item(
            owner_id=user.id, title="older", domain="Research", state="active", fields={}
        )
        newer = Item(
            owner_id=user.id, title="newer", domain="Research", state="active", fields={}
        )
        s.add_all([older, newer])
        await s.commit()
        older_id = older.id

    response = await auth_client.post(
        f"/api/agent/items/{older_id}/checkpoints",
        headers=bearer(pat),
        json={
            "outcome": "active",
            "last_state": "working",
            "resume_from": "resume here",
        },
    )
    assert response.status_code == 201

    response = await auth_client.get("/api/agent/orient", headers=bearer(pat))
    body = response.json()
    assert body["items"][0]["title"] == "older"


async def test_item_detail_phases_and_receipts(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        container = Item(
            owner_id=user.id,
            title="container",
            domain="Research",
            state="active",
            compiled=True,
            fields={},
        )
        s.add(container)
        await s.flush()
        phase1 = Item(
            owner_id=user.id,
            parent_id=container.id,
            title="phase 1",
            domain="Research",
            state="active",
            fields={"firstAction": "do the thing"},
        )
        phase2 = Item(
            owner_id=user.id,
            parent_id=container.id,
            title="phase 2",
            domain="Research",
            state="active",
            fields={},
        )
        s.add_all([phase1, phase2])
        await s.commit()
        container_id = container.id
        phase1_id = phase1.id

    response = await auth_client.post(
        f"/api/agent/items/{phase1_id}/checkpoints",
        headers=bearer(pat),
        json={
            "outcome": "active",
            "last_state": "in progress",
            "resume_from": "src/foo.py:10",
        },
    )
    assert response.status_code == 201

    response = await auth_client.get(
        f"/api/agent/items/{container_id}", headers=bearer(pat)
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["phases"]) == 2
    phase1_out = next(p for p in body["phases"] if p["title"] == "phase 1")
    assert phase1_out["latest_checkpoint"] is not None
    assert phase1_out["first_action"] == "do the thing"


async def test_item_detail_404_other_owner(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        other = User(email="other-detail@example.com", hashed_password="x")
        s.add(other)
        await s.flush()
        item = Item(
            owner_id=other.id, title="not yours", domain="Research", state="active", fields={}
        )
        s.add(item)
        await s.commit()
        item_id = item.id

    response = await auth_client.get(f"/api/agent/items/{item_id}", headers=bearer(pat))
    assert response.status_code == 404


async def test_agent_checkpoint_moves_state_and_rolls_up(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        container = Item(
            owner_id=user.id, title="container2", domain="Research", state="active", fields={}
        )
        s.add(container)
        await s.flush()
        phase1 = Item(
            owner_id=user.id,
            parent_id=container.id,
            title="p1",
            domain="Research",
            state="active",
            fields={},
        )
        phase2 = Item(
            owner_id=user.id,
            parent_id=container.id,
            title="p2",
            domain="Research",
            state="active",
            fields={},
        )
        s.add_all([phase1, phase2])
        await s.commit()
        container_id = container.id
        phase1_id = phase1.id
        phase2_id = phase2.id

    r1 = await auth_client.post(
        f"/api/agent/items/{phase1_id}/checkpoints",
        headers=bearer(pat),
        json={
            "outcome": "done",
            "last_state": "finished phase 1",
            "what_changed": "phase 1 implemented",
        },
    )
    assert r1.status_code == 201

    async with sessionmaker_() as s:
        p1 = await s.get(Item, phase1_id)
        assert p1.state == "done"
        container = await s.get(Item, container_id)
        assert container.state == "active"

    r2 = await auth_client.post(
        f"/api/agent/items/{phase2_id}/checkpoints",
        headers=bearer(pat),
        json={
            "outcome": "done",
            "last_state": "finished phase 2",
            "what_changed": "phase 2 implemented",
        },
    )
    assert r2.status_code == 201

    async with sessionmaker_() as s:
        container = await s.get(Item, container_id)
        assert container.state == "done"


async def test_agent_checkpoint_validation(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        item = Item(
            owner_id=user.id, title="leaf", domain="Research", state="active", fields={}
        )
        s.add(item)
        await s.commit()
        item_id = item.id

    response = await auth_client.post(
        f"/api/agent/items/{item_id}/checkpoints",
        headers=bearer(pat),
        json={"outcome": "active", "last_state": "stuck"},
    )
    assert response.status_code == 422


async def test_agent_done_requires_what_changed(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        item = Item(
            owner_id=user.id, title="leaf2", domain="Research", state="active", fields={}
        )
        s.add(item)
        await s.commit()
        item_id = item.id

    bare = await auth_client.post(
        f"/api/agent/items/{item_id}/checkpoints",
        headers=bearer(pat),
        json={"outcome": "done", "last_state": "finished"},
    )
    assert bare.status_code == 422
    assert "what_changed" in bare.json()["detail"]

    async with sessionmaker_() as s:
        untouched = await s.get(Item, item_id)
        assert untouched.state == "active"  # the rejected receipt changed nothing

    full = await auth_client.post(
        f"/api/agent/items/{item_id}/checkpoints",
        headers=bearer(pat),
        json={
            "outcome": "done",
            "last_state": "finished",
            "what_changed": "implemented and verified end-time surfacing",
        },
    )
    assert full.status_code == 201
    assert full.json()["what_changed"] == "implemented and verified end-time surfacing"


async def test_agent_checkpoint_trashed_item_404(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        item = Item(
            owner_id=user.id,
            title="trashed leaf",
            domain="Research",
            state="killed",
            deleted_at=datetime.now(timezone.utc),
            fields={},
        )
        s.add(item)
        await s.commit()
        item_id = item.id

    response = await auth_client.post(
        f"/api/agent/items/{item_id}/checkpoints",
        headers=bearer(pat),
        json={"outcome": "done", "last_state": "n/a"},
    )
    assert response.status_code == 404


async def test_capture_defaults_to_reservoir(auth_client, pat):
    response = await auth_client.post(
        "/api/agent/capture", headers=bearer(pat), json={"text": "stray thought"}
    )
    assert response.status_code == 201
    body = response.json()
    assert body["domain"] == "reservoir"
    assert body["state"] == "idea"


async def test_capture_into_known_domain(auth_client, sessionmaker_, user, pat):
    async with sessionmaker_() as s:
        s.add(Domain(owner_id=user.id, name="Research"))
        await s.commit()

    response = await auth_client.post(
        "/api/agent/capture",
        headers=bearer(pat),
        json={"text": "a task", "domain": "Research"},
    )
    assert response.status_code == 201
    body = response.json()
    assert body["state"] == "needsdef"


async def test_capture_unknown_domain_422(auth_client, pat):
    response = await auth_client.post(
        "/api/agent/capture",
        headers=bearer(pat),
        json={"text": "a task", "domain": "madeup"},
    )
    assert response.status_code == 422
    assert "madeup" in response.json()["detail"]


async def test_capture_never_compiled(auth_client, sessionmaker_, pat):
    response = await auth_client.post(
        "/api/agent/capture", headers=bearer(pat), json={"text": "check compiled"}
    )
    assert response.status_code == 201
    item_id = response.json()["id"]

    async with sessionmaker_() as s:
        from uuid import UUID

        item = await s.get(Item, UUID(item_id))
        assert item.compiled is False


async def test_pat_last_used_stamped(auth_client, sessionmaker_, user, pat):
    response = await auth_client.get("/api/agent/orient", headers=bearer(pat))
    assert response.status_code == 200

    async with sessionmaker_() as s:
        from app.models import PersonalAccessToken

        result = await s.execute(
            select(PersonalAccessToken).where(PersonalAccessToken.owner_id == user.id)
        )
        row = result.scalars().first()
        assert row.last_used_at is not None
