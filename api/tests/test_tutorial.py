"""First-run activation: tutorial seeding and the first-checkpoint flag."""
from __future__ import annotations

from app.services.google_auth import get_or_link_google_user
from app.services.tutorial import TUTORIAL_DOMAIN, seed_tutorial


async def test_register_seeds_resumable_tutorial(auth_client):
    r = await auth_client.post(
        "/api/auth/register", json={"email": "fresh@example.com", "password": "secret1"}
    )
    assert r.status_code == 201
    r = await auth_client.post(
        "/api/auth/login", json={"email": "fresh@example.com", "password": "secret1"}
    )
    token = r.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # First screen: TODAY holds exactly the tutorial item, already checkpointed,
    # so the resume card renders with zero clicks.
    r = await auth_client.get("/api/items", params={"tab": "today"}, headers=headers)
    rows = r.json()
    assert len(rows) == 1
    item = rows[0]
    assert item["is_tutorial"] is True
    assert item["compiled"] is True
    assert item["latest_checkpoint"] is not None
    assert item["latest_checkpoint"]["do_not_redo"] == "signing up"

    # The tutorial's domain stays out of the sidebar — no new vocabulary.
    r = await auth_client.get("/api/domains", headers=headers)
    assert all(d["name"] != TUTORIAL_DOMAIN for d in r.json())


async def test_first_google_signin_seeds_tutorial(session):
    user = await get_or_link_google_user(
        session, email="g@example.com", google_sub="sub-1"
    )
    await session.commit()
    from sqlalchemy import select

    from app.models import Item

    items = (
        (await session.execute(select(Item).where(Item.owner_id == user.id)))
        .scalars()
        .all()
    )
    assert len(items) == 1
    assert items[0].is_tutorial is True

    # signing in again must not seed a second tutorial
    await get_or_link_google_user(session, email="g@example.com", google_sub="sub-1")
    await session.commit()
    items = (
        (await session.execute(select(Item).where(Item.owner_id == user.id)))
        .scalars()
        .all()
    )
    assert len(items) == 1


async def test_first_user_checkpoint_flag(client, session, user):
    # seeded tutorial receipt exists but must never count as user-authored
    await seed_tutorial(session, user.id)
    await session.commit()

    r = await client.post("/api/items", json={"title": "real work", "domain": "DDWS"})
    iid = r.json()["id"]
    payload = {
        "outcome": "active",
        "last_state": "s",
        "next_action": "n",
        "resume_from": "r",
    }

    r = await client.post(f"/api/items/{iid}/checkpoints", json=payload)
    assert r.status_code == 201
    assert r.json()["first_user_checkpoint"] is True

    # second checkpoint closes as today — no reveal
    r = await client.post(f"/api/items/{iid}/checkpoints", json=payload)
    assert r.json()["first_user_checkpoint"] is False


async def test_tutorial_checkpoint_never_flags_first(client, session, user):
    tutorial = await seed_tutorial(session, user.id)
    await session.commit()
    payload = {
        "outcome": "done",
        "last_state": "s",
        "next_action": "n",
        "resume_from": "r",
    }
    r = await client.post(f"/api/items/{tutorial.id}/checkpoints", json=payload)
    assert r.status_code == 201
    assert r.json()["first_user_checkpoint"] is False
