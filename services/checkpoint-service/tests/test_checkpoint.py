import os
import tempfile
from pathlib import Path

os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.mkdtemp()) / 'checkpoint-test.db'}"

from fastapi.testclient import TestClient

from app.database import Base, engine
from app.main import app


Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def headers(user_id: str) -> dict[str, str]:
    return {"X-User-Id": user_id}


def test_active_set_checkpoint_and_user_isolation() -> None:
    first = client.post(
        "/missions?active_limit=1",
        headers=headers("user-a"),
        json={"title": "Finish anomaly detection direction", "status": "active", "next_action": "Write three claims"},
    )
    assert first.status_code == 201
    mission_id = first.json()["id"]
    assert first.json()["active_rank"] == 1

    second = client.post(
        "/missions?active_limit=1",
        headers=headers("user-a"),
        json={"title": "Second active mission", "status": "active", "next_action": "Do later"},
    )
    assert second.status_code == 201
    assert second.json()["active_rank"] == 2

    third = client.post(
        "/missions?active_limit=1",
        headers=headers("user-a"),
        json={"title": "Third active mission", "status": "active", "next_action": "Do third"},
    )
    assert third.status_code == 201
    assert third.json()["active_rank"] == 3

    blocked = client.post(
        "/missions?active_limit=1",
        headers=headers("user-a"),
        json={"title": "Fourth active mission", "status": "active", "next_action": "Do later"},
    )
    assert blocked.status_code == 409
    assert blocked.json()["detail"] == "active_set_full"

    promoted = client.post(f"/missions/{second.json()['id']}/promote", headers=headers("user-a"))
    assert promoted.status_code == 200
    assert promoted.json()["active_rank"] == 1

    hidden_from_other_user = client.get("/missions", headers=headers("user-b"))
    assert hidden_from_other_user.status_code == 200
    assert hidden_from_other_user.json() == []

    checkpoint = client.post(
        f"/missions/{mission_id}/checkpoints",
        headers=headers("user-a"),
        json={
            "changed": "Compared contribution angles",
            "decision": "Keep the narrow novelty frame",
            "where_stopped": "Two claims drafted",
            "next_action": "Reject the weakest claim",
            "do_not_rethink": "Do not revisit tooling",
        },
    )
    assert checkpoint.status_code == 201

    today = client.get("/today", headers=headers("user-a"))
    assert today.status_code == 200
    assert today.json()["primary_mission"]["id"] == second.json()["id"]

    restored = client.post(f"/missions/{mission_id}/promote", headers=headers("user-a"))
    assert restored.status_code == 200
    today = client.get("/today", headers=headers("user-a"))
    assert today.status_code == 200
    assert today.json()["primary_mission"]["next_action"] == "Reject the weakest claim"
    assert today.json()["last_checkpoint"]["do_not_rethink"] == "Do not revisit tooling"


def test_parking_items_are_user_scoped() -> None:
    created = client.post("/parking-items", headers=headers("owner"), json={"title": "Compare tools later", "note": "Not today"})
    assert created.status_code == 201

    owner_items = client.get("/parking-items", headers=headers("owner"))
    other_items = client.get("/parking-items", headers=headers("other"))
    assert len(owner_items.json()) == 1
    assert other_items.json() == []
