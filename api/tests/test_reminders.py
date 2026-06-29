"""Reminder subsystem: policy guardrails, the nudge evaluation, tick dedupe /
suppression, catch-up, and the CRUD endpoints (ADR-001).

Pushes are stubbed (no pywebpush / network): we assert what *would* be sent and
that the silence/back-off rules gate it.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest

from app.models import Checkpoint, Item, Reminder, UserSettings
from app.services import push
from app.services import reminders as svc


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _add_item(session, owner_id, *, state="active", title="work", is_tutorial=False):
    item = Item(
        owner_id=owner_id,
        title=title,
        domain="DDWS",
        state=state,
        daily=False,
        compiled=True,
        is_tutorial=is_tutorial,
        all_day=False,
        source="local",
    )
    session.add(item)
    await session.flush()
    return item


async def _add_checkpoint(session, item_id, *, when=None, resume_from="line 10", next_action="do x"):
    cp = Checkpoint(
        item_id=item_id,
        outcome="active",
        last_state="halfway",
        next_action=next_action,
        resume_from=resume_from,
    )
    session.add(cp)
    await session.flush()
    if when is not None:
        cp.created_at = when
        await session.flush()
    return cp


@pytest.fixture
def captured_push(monkeypatch):
    """Replace push.send_to_owner with a recorder; returns the list of sends."""
    sends: list[tuple[uuid.UUID, dict]] = []

    async def fake_send(session, owner_id, payload):
        sends.append((owner_id, payload))
        return 1

    monkeypatch.setattr(push, "send_to_owner", fake_send)
    return sends


# --- pure policy -------------------------------------------------------------


def test_reminder_allowed_suppresses_finished_and_trashed():
    assert svc.reminder_allowed(Item(state="active", deleted_at=None)) is True
    assert svc.reminder_allowed(Item(state="done", deleted_at=None)) is False
    assert svc.reminder_allowed(Item(state="killed", deleted_at=None)) is False
    assert svc.reminder_allowed(Item(state="active", deleted_at=_utcnow())) is False
    assert svc.reminder_allowed(None) is False


def test_quiet_hours_normal_and_wrapping():
    s = UserSettings(time_zone="UTC", quiet_hours_start="22:00", quiet_hours_end="07:00")
    # 23:30 UTC is inside a wrapping 22:00–07:00 window
    assert svc.in_quiet_hours(s, datetime(2026, 6, 29, 23, 30, tzinfo=timezone.utc))
    # 12:00 UTC is outside it
    assert not svc.in_quiet_hours(s, datetime(2026, 6, 29, 12, 0, tzinfo=timezone.utc))
    # non-wrapping window
    s2 = UserSettings(time_zone="UTC", quiet_hours_start="09:00", quiet_hours_end="17:00")
    assert svc.in_quiet_hours(s2, datetime(2026, 6, 29, 10, 0, tzinfo=timezone.utc))
    assert not svc.in_quiet_hours(s2, datetime(2026, 6, 29, 18, 0, tzinfo=timezone.utc))
    # unset window is never quiet
    assert not svc.in_quiet_hours(UserSettings(), _utcnow())


# --- nudge evaluation --------------------------------------------------------


async def test_nudge_requires_opt_in(session, user):
    s = await svc.get_or_create_settings(session, user.id)
    s.reminders_enabled = False
    s.nudge_opt_in = False
    should, _ = await svc.evaluate_nudge(session, s, _utcnow())
    assert should is False


async def test_nudge_silent_when_no_open_thread(session, user, captured_push):
    s = await svc.get_or_create_settings(session, user.id)
    s.reminders_enabled = True
    s.nudge_opt_in = True
    # No items at all -> nothing to resume -> silence.
    should, thread = await svc.evaluate_nudge(session, s, _utcnow())
    assert should is False and thread is None


async def test_nudge_fires_with_open_thread_then_caps_per_day(session, user):
    item = await _add_item(session, user.id, title="parser")
    await _add_checkpoint(session, item.id, when=_utcnow() - timedelta(days=3))
    s = await svc.get_or_create_settings(session, user.id)
    s.reminders_enabled = True
    s.nudge_opt_in = True

    should, thread = await svc.evaluate_nudge(session, s, _utcnow())
    assert should is True and thread is not None and thread[0].id == item.id

    # Record a send today, then the daily cap blocks a second.
    svc._record_nudge_sent(s, _utcnow())
    should2, _ = await svc.evaluate_nudge(session, s, _utcnow())
    assert should2 is False


async def test_nudge_skipped_if_returned_today(session, user):
    item = await _add_item(session, user.id)
    # A checkpoint dated today = "already in the loop".
    await _add_checkpoint(session, item.id, when=_utcnow())
    s = await svc.get_or_create_settings(session, user.id)
    s.reminders_enabled = True
    s.nudge_opt_in = True
    should, _ = await svc.evaluate_nudge(session, s, _utcnow())
    assert should is False


async def test_nudge_backs_off_after_repeated_ignores(session, user):
    item = await _add_item(session, user.id)
    await _add_checkpoint(session, item.id, when=_utcnow() - timedelta(days=10))
    s = await svc.get_or_create_settings(session, user.id)
    s.reminders_enabled = True
    s.nudge_opt_in = True
    # Ignored 3x, last sent 2 days ago -> within the weekly back-off, suppress.
    s.nudge_state = {
        "last_sent_date": (_utcnow() - timedelta(days=2)).date().isoformat(),
        "consecutive_unreturned": 3,
    }
    should, _ = await svc.evaluate_nudge(session, s, _utcnow())
    assert should is False

    # Same back-off but 8 days have passed -> the weekly nudge is due again.
    s.nudge_state = {
        "last_sent_date": (_utcnow() - timedelta(days=8)).date().isoformat(),
        "consecutive_unreturned": 3,
    }
    should2, _ = await svc.evaluate_nudge(session, s, _utcnow())
    assert should2 is True


# --- tick: task reminders ----------------------------------------------------


async def test_tick_fires_due_reminder_once(session, user, captured_push):
    item = await _add_item(session, user.id, title="ship it")
    await _add_checkpoint(session, item.id)
    s = await svc.get_or_create_settings(session, user.id)
    s.reminders_enabled = True
    r = Reminder(
        owner_id=user.id,
        item_id=item.id,
        fire_at=_utcnow() - timedelta(minutes=1),
        status="pending",
    )
    session.add(r)
    await session.flush()

    tally = await svc.tick(session, _utcnow())
    assert tally["reminders_fired"] == 1
    assert r.status == "sent" and r.sent_at is not None
    assert len(captured_push) == 1
    _, payload = captured_push[0]
    assert payload["title"] == "⟲ ship it"
    assert payload["data"]["url"] == f"/?resume={item.id}"

    # Second tick must not re-fire (dedupe via status).
    captured_push.clear()
    await svc.tick(session, _utcnow())
    assert captured_push == []


async def test_tick_suppresses_done_item(session, user, captured_push):
    item = await _add_item(session, user.id, state="done")
    s = await svc.get_or_create_settings(session, user.id)
    s.reminders_enabled = True
    r = Reminder(
        owner_id=user.id,
        item_id=item.id,
        fire_at=_utcnow() - timedelta(minutes=1),
        status="pending",
    )
    session.add(r)
    await session.flush()

    tally = await svc.tick(session, _utcnow())
    assert tally["reminders_suppressed"] == 1
    assert tally["reminders_fired"] == 0
    assert r.status == "sent"  # still claimed, just not delivered
    assert captured_push == []


async def test_tick_holds_during_quiet_hours(session, user, captured_push):
    item = await _add_item(session, user.id)
    s = await svc.get_or_create_settings(session, user.id)
    s.reminders_enabled = True
    s.time_zone = "UTC"
    now = datetime(2026, 6, 29, 23, 0, tzinfo=timezone.utc)
    s.quiet_hours_start = "22:00"
    s.quiet_hours_end = "07:00"
    r = Reminder(
        owner_id=user.id, item_id=item.id, fire_at=now - timedelta(minutes=5), status="pending"
    )
    session.add(r)
    await session.flush()

    await svc.tick(session, now)
    assert r.status == "pending"  # held for after the window
    assert captured_push == []


async def test_catch_up_retires_stale_without_firing(session, user, captured_push):
    item = await _add_item(session, user.id)
    s = await svc.get_or_create_settings(session, user.id)
    s.reminders_enabled = True
    stale = Reminder(
        owner_id=user.id, item_id=item.id,
        fire_at=_utcnow() - timedelta(hours=5), status="pending",
    )
    fresh = Reminder(
        owner_id=user.id, item_id=item.id,
        fire_at=_utcnow() - timedelta(minutes=2), status="pending",
    )
    session.add_all([stale, fresh])
    await session.flush()

    await svc.catch_up(session, grace_minutes=120, now=_utcnow())
    # Re-read from the DB: catch_up retires stale rows via a bulk UPDATE, which
    # doesn't necessarily sync every attribute on the in-memory ORM instance.
    await session.refresh(stale)
    await session.refresh(fresh)
    assert stale.status == "sent" and stale.sent_at is not None
    assert fresh.status == "sent"
    # Only the fresh one actually pushed.
    assert len(captured_push) == 1


# --- API surface -------------------------------------------------------------


async def test_reminder_crud_is_owner_scoped(client):
    r = await client.post("/api/items", json={"title": "task", "domain": "DDWS", "state": "active"})
    iid = r.json()["id"]
    fire_at = (_utcnow() + timedelta(hours=2)).isoformat()
    r = await client.post("/api/reminders", json={"item_id": iid, "fire_at": fire_at})
    assert r.status_code == 201
    rid = r.json()["id"]
    assert r.json()["status"] == "pending"

    r = await client.get("/api/reminders", params={"item_id": iid})
    assert len(r.json()) == 1

    r = await client.delete(f"/api/reminders/{rid}")
    assert r.status_code == 204
    r = await client.get("/api/reminders", params={"item_id": iid})
    assert r.json() == []


async def test_reminder_rejects_past_time_and_unknown_item(client):
    r = await client.post("/api/items", json={"title": "t", "domain": "DDWS", "state": "active"})
    iid = r.json()["id"]
    past = (_utcnow() - timedelta(hours=1)).isoformat()
    r = await client.post("/api/reminders", json={"item_id": iid, "fire_at": past})
    assert r.status_code == 422

    future = (_utcnow() + timedelta(hours=1)).isoformat()
    r = await client.post(
        "/api/reminders", json={"item_id": str(uuid.uuid4()), "fire_at": future}
    )
    assert r.status_code == 404


async def test_settings_patch_roundtrip(client):
    r = await client.get("/api/settings")
    assert r.status_code == 200
    assert r.json()["reminders_enabled"] is False

    r = await client.patch(
        "/api/settings",
        json={"reminders_enabled": True, "nudge_opt_in": True, "quiet_hours_start": "22:00"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["reminders_enabled"] is True
    assert body["nudge_opt_in"] is True
    assert body["quiet_hours_start"] == "22:00"

    # Empty string clears the optional field.
    r = await client.patch("/api/settings", json={"quiet_hours_start": ""})
    assert r.json()["quiet_hours_start"] is None


async def test_push_subscribe_503_when_unconfigured(client):
    # No VAPID configured in the test env -> push endpoints are unavailable.
    r = await client.get("/api/push/vapid-public-key")
    assert r.status_code == 503
    r = await client.post(
        "/api/push/subscriptions",
        json={"endpoint": "https://x", "keys": {"p256dh": "a", "auth": "b"}},
    )
    assert r.status_code == 503
