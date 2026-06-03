import os
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

os.environ["DATABASE_URL"] = f"sqlite:///{Path(tempfile.mkdtemp()) / 'checkpoint-test.db'}"

from fastapi.testclient import TestClient
from sqlalchemy import inspect, text

from app.database import Base, SessionLocal, engine
from app.main import app, ensure_schema
from app.models import Checkpoint, RewardEvent, WorkSession


Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

client = TestClient(app)


def headers(user_id: str) -> dict[str, str]:
    return {"X-User-Id": user_id}


def test_schema_migration_adds_v2_columns_to_existing_tables() -> None:
    Base.metadata.drop_all(bind=engine)
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE missions (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, title VARCHAR(240) NOT NULL)"))
        connection.execute(text("CREATE TABLE state_logs (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, state VARCHAR(32) NOT NULL)"))
        connection.execute(text("CREATE TABLE reward_events (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, kind VARCHAR(40) NOT NULL, message TEXT NOT NULL)"))

    ensure_schema()

    inspector = inspect(engine)
    mission_columns = {column["name"] for column in inspector.get_columns("missions")}
    state_columns = {column["name"] for column in inspector.get_columns("state_logs")}
    reward_columns = {column["name"] for column in inspector.get_columns("reward_events")}
    assert {"parent_id", "mission_kind", "activation_energy", "est_minutes", "reward_type"}.issubset(mission_columns)
    assert {"energy_focus", "energy_emotional", "novelty_hunger"}.issubset(state_columns)
    assert {"momentum_delta", "clarity_delta", "resilience_delta", "reason"}.issubset(reward_columns)

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


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
    assert started.json()["momentum_delta"] == 1
    assert started.json()["session"]["mission_id"] == mission_id

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
    assert updated_today.json()["director"]["momentum"] >= 2


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

    micro = client.post(
        f"/missions/{mission_id}/micro-missions",
        headers=headers("recovery-user"),
        json={"title": "Touch the outline", "next_action": "Open the outline for two minutes"},
    )
    assert micro.status_code == 201
    micro_recovered = client.post(
        "/today/start",
        headers=headers("recovery-user"),
        json={"mission_id": micro.json()["id"], "state": "Avoiding", "action_text": "Open the outline for two minutes"},
    )
    assert micro_recovered.status_code == 201
    assert micro_recovered.json()["kind"] == "returned_after_gap"

    recovered = client.post(
        "/today/start",
        headers=headers("recovery-user"),
        json={"mission_id": mission_id, "state": "Recovering", "action_text": "Open the outline"},
    )
    assert recovered.status_code == 201
    assert recovered.json()["kind"] == "returned_after_gap"
    assert recovered.json()["message"] == "Return counts. Resilience restored."
    assert recovered.json()["resilience_delta"] == 2


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


def test_micro_missions_are_user_scoped_and_do_not_affect_active_cap() -> None:
    parent = client.post(
        "/missions",
        headers=headers("micro-user"),
        json={"title": "Heavy paper section", "status": "active", "next_action": "Open the paper"},
    )
    assert parent.status_code == 201
    parent_id = parent.json()["id"]

    for index in range(2):
        top_level = client.post(
            "/missions",
            headers=headers("micro-user"),
            json={"title": f"Top level {index}", "status": "active", "next_action": "Do top level"},
        )
        assert top_level.status_code == 201

    micro = client.post(
        f"/missions/{parent_id}/micro-missions",
        headers=headers("micro-user"),
        json={"title": "Open outline for two minutes", "next_action": "Open outline.md", "est_minutes": 2},
    )
    assert micro.status_code == 201
    assert micro.json()["parent_id"] == parent_id
    assert micro.json()["active_rank"] is None

    blocked_top_level = client.post(
        "/missions",
        headers=headers("micro-user"),
        json={"title": "Fourth top level", "status": "active", "next_action": "Too much"},
    )
    assert blocked_top_level.status_code == 409

    hidden_from_other_user = client.get(f"/missions/{parent_id}/micro-missions", headers=headers("other-micro-user"))
    assert hidden_from_other_user.status_code == 404

    top_level_list = client.get("/missions", headers=headers("micro-user"))
    assert all(item["parent_id"] is None for item in top_level_list.json())


def test_director_recommends_low_energy_micro_mission_and_completion_rewards() -> None:
    parent = client.post(
        "/missions",
        headers=headers("recommend-user"),
        json={"title": "Write scary section", "status": "active", "next_action": "Open scary.md"},
    )
    assert parent.status_code == 201
    parent_id = parent.json()["id"]
    client.post(
        f"/missions/{parent_id}/micro-missions",
        headers=headers("recommend-user"),
        json={
            "title": "Collect three rough bullets",
            "next_action": "Open scary.md and write rough bullets",
            "activation_energy": "low",
            "cognitive_load": "low",
            "emotional_resistance": "low",
            "est_minutes": 3,
        },
    )
    client.post("/today/state", headers=headers("recommend-user"), json={"state": "Overwhelmed"})

    today = client.get("/today", headers=headers("recommend-user"))
    assert today.status_code == 200
    recommended = today.json()["director"]["recommended_micro_mission"]
    assert recommended["title"] == "Collect three rough bullets"
    assert today.json()["director"]["entry_move"] == "Open scary.md and write rough bullets"

    completed = client.post(
        f"/missions/{recommended['id']}/complete",
        headers=headers("recommend-user"),
        json={"completion_note": "Rough bullets exist"},
    )
    assert completed.status_code == 201
    assert completed.json()["kind"] == "completed"
    assert completed.json()["momentum_delta"] >= 1


def test_work_session_heartbeat_stale_recovery_and_checkpoint_end() -> None:
    mission = client.post(
        "/missions",
        headers=headers("session-user"),
        json={"title": "Session mission", "status": "active", "next_action": "Open session.md"},
    )
    assert mission.status_code == 201
    mission_id = mission.json()["id"]

    started = client.post(
        "/today/start",
        headers=headers("session-user"),
        json={"mission_id": mission_id, "state": "Locked in", "action_text": "Open session.md"},
    )
    assert started.status_code == 201
    session_id = started.json()["session"]["id"]

    heartbeat = client.post("/today/heartbeat", headers=headers("session-user"), json={"mission_id": mission_id})
    assert heartbeat.status_code == 200
    assert heartbeat.json()["id"] == session_id

    old = datetime.now(timezone.utc) - timedelta(days=2)
    with SessionLocal() as db:
        session = db.get(WorkSession, session_id)
        assert session is not None
        session.last_heartbeat_at = old
        db.commit()

    today = client.get("/today", headers=headers("session-user"))
    assert today.status_code == 200
    assert today.json()["director"]["session_stale"] is True
    assert today.json()["director"]["recovery_due"] is True

    checkpoint = client.post(
        f"/missions/{mission_id}/checkpoints",
        headers=headers("session-user"),
        json={
            "changed": "Session checkpoint",
            "decision": "",
            "where_stopped": "At a safe stop",
            "next_action": "Resume next line",
            "do_not_rethink": "",
        },
    )
    assert checkpoint.status_code == 201
    with SessionLocal() as db:
        session = db.get(WorkSession, session_id)
        assert session is not None
        assert session.ended_at is not None
        assert session.end_kind == "checkpoint_saved"
