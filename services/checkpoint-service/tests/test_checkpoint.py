import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.mkdtemp()) / 'checkpoint-test.db'}"

from fastapi.testclient import TestClient

from app.database import Base, SessionLocal, engine
from app.main import app
from app.models import Checkpoint, RewardEvent


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


def test_director_state_start_rewards_and_user_isolation() -> None:
    mission = client.post(
        "/missions",
        headers=headers("director-user"),
        json={"title": "Write the uncomfortable section", "status": "active", "next_action": "Open draft.md for two minutes"},
    )
    assert mission.status_code == 201
    mission_id = mission.json()["id"]

    today = client.get("/today", headers=headers("director-user"))
    assert today.status_code == 200
    assert today.json()["director"]["current_state"] is None
    assert today.json()["director"]["entry_move"] == "Open draft.md for two minutes"

    state = client.post("/today/state", headers=headers("director-user"), json={"state": "Avoiding"})
    assert state.status_code == 201
    assert state.json()["state"] == "Avoiding"

    blocked = client.post(
        "/today/start",
        headers=headers("other-director-user"),
        json={"mission_id": mission_id, "state": "Avoiding", "action_text": "Open draft.md for two minutes"},
    )
    assert blocked.status_code == 404

    started = client.post(
        "/today/start",
        headers=headers("director-user"),
        json={"mission_id": mission_id, "state": "Avoiding", "action_text": "Open draft.md for two minutes"},
    )
    assert started.status_code == 201
    assert started.json()["kind"] == "started"
    assert started.json()["message"] == "You broke avoidance. Momentum restored."

    resumed = client.post(
        "/today/start",
        headers=headers("director-user"),
        json={"mission_id": mission_id, "state": "Locked in", "action_text": "Open draft.md for two minutes"},
    )
    assert resumed.status_code == 201
    assert resumed.json()["kind"] == "resumed"

    updated_today = client.get("/today", headers=headers("director-user"))
    assert updated_today.json()["director"]["current_state"] == "Locked in"
    assert updated_today.json()["director"]["latest_reward"]["kind"] == "resumed"


def test_recovery_is_due_after_old_checkpoint_or_reward_activity() -> None:
    mission = client.post(
        "/missions",
        headers=headers("recovery-user"),
        json={"title": "Return to the paper", "status": "active", "next_action": "Open the outline"},
    )
    assert mission.status_code == 201
    mission_id = mission.json()["id"]

    checkpoint = client.post(
        f"/missions/{mission_id}/checkpoints",
        headers=headers("recovery-user"),
        json={
            "changed": "Stopped mid-outline",
            "decision": "",
            "where_stopped": "Halfway through the framing",
            "next_action": "Open the outline",
            "do_not_rethink": "",
        },
    )
    assert checkpoint.status_code == 201

    old = datetime.now(timezone.utc) - timedelta(days=2)
    with SessionLocal() as db:
        db_checkpoint = db.get(Checkpoint, checkpoint.json()["id"])
        assert db_checkpoint is not None
        db_checkpoint.created_at = old
        rewards = db.query(RewardEvent).filter(RewardEvent.user_id == "recovery-user", RewardEvent.mission_id == mission_id).all()
        assert rewards
        for reward in rewards:
            reward.created_at = old
        db.commit()

    today = client.get("/today", headers=headers("recovery-user"))
    assert today.status_code == 200
    assert today.json()["director"]["recovery_due"] is True
    assert today.json()["director"]["recommended_mode"] == "recovery"

    recovered = client.post(
        "/today/start",
        headers=headers("recovery-user"),
        json={"mission_id": mission_id, "state": "Recovering", "action_text": "Open the outline"},
    )
    assert recovered.status_code == 201
    assert recovered.json()["kind"] == "returned_after_gap"
    assert recovered.json()["message"] == "Return counts. Resilience restored."


def test_checkpoint_save_creates_reward_event() -> None:
    mission = client.post(
        "/missions",
        headers=headers("checkpoint-reward-user"),
        json={"title": "Leave useful trace", "status": "active", "next_action": "Write the next line"},
    )
    assert mission.status_code == 201
    mission_id = mission.json()["id"]

    checkpoint = client.post(
        f"/missions/{mission_id}/checkpoints",
        headers=headers("checkpoint-reward-user"),
        json={
            "changed": "Draft moved",
            "decision": "Keep scope",
            "where_stopped": "Ready for next line",
            "next_action": "Write the next line",
            "do_not_rethink": "Do not change scope",
        },
    )
    assert checkpoint.status_code == 201

    today = client.get("/today", headers=headers("checkpoint-reward-user"))
    assert today.status_code == 200
    assert today.json()["director"]["latest_reward"]["kind"] == "checkpoint_saved"
