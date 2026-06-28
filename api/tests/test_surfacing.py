"""Date-based surfacing into Today / Ready, and the new time fields.

Times are all built in UTC and the list endpoint defaults its day window to UTC,
so these assertions are independent of the machine's local timezone.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _capture(client, text: str, domain: str = "DDWS") -> str:
    r = await client.post("/api/items/capture", json={"text": text, "domain": domain})
    assert r.status_code == 201
    return r.json()["id"]


async def _ids(client, tab: str) -> set[str]:
    r = await client.get("/api/items", params={"tab": tab})
    assert r.status_code == 200
    return {i["id"] for i in r.json()}


async def test_deadline_today_surfaces_in_today(client):
    iid = await _capture(client, "due today")
    r = await client.patch(f"/api/items/{iid}", json={"deadline": _now().isoformat()})
    assert r.status_code == 200
    assert r.json()["deadline"] is not None
    assert iid in await _ids(client, "today")


async def test_overdue_deadline_surfaces_in_today(client):
    iid = await _capture(client, "overdue")
    past = (_now() - timedelta(days=2)).isoformat()
    await client.patch(f"/api/items/{iid}", json={"deadline": past})
    assert iid in await _ids(client, "today")


async def test_start_today_surfaces_in_today(client):
    iid = await _capture(client, "starts today")
    await client.patch(f"/api/items/{iid}", json={"start_at": _now().isoformat()})
    assert iid in await _ids(client, "today")


async def test_future_start_is_in_ready_not_today(client):
    iid = await _capture(client, "starts soon")
    soon = (_now() + timedelta(days=3)).isoformat()
    await client.patch(f"/api/items/{iid}", json={"start_at": soon})
    assert iid in await _ids(client, "ready")
    assert iid not in await _ids(client, "today")


async def test_far_future_is_beyond_ready_horizon(client):
    iid = await _capture(client, "starts much later")
    far = (_now() + timedelta(days=30)).isoformat()
    await client.patch(f"/api/items/{iid}", json={"start_at": far})
    assert iid not in await _ids(client, "ready")
    assert iid not in await _ids(client, "today")


async def test_compiled_due_today_shows_in_today_only(client):
    """A compiled task due today must not appear in both views — Today wins."""
    iid = await _capture(client, "compiled and due")
    r = await client.post(
        f"/api/items/{iid}/compile",
        json={
            "procedure": "known",
            "scope": "bounded",
            "description": "d",
            "firstAction": "go",
            "deadline": _now().isoformat(),
        },
    )
    assert r.json()["compiled"] is True
    assert r.json()["deadline"] is not None
    assert iid in await _ids(client, "today")
    assert iid not in await _ids(client, "ready")


async def test_compile_persists_schedule_and_marks_local(client):
    iid = await _capture(client, "timed compile")
    start = _now() + timedelta(days=1)
    end = start + timedelta(hours=1)
    r = await client.post(
        f"/api/items/{iid}/compile",
        json={
            "procedure": "known",
            "scope": "bounded",
            "description": "d",
            "firstAction": "go",
            "start_at": start.isoformat(),
            "end_at": end.isoformat(),
            "all_day": False,
        },
    )
    body = r.json()
    assert body["start_at"] is not None
    assert body["end_at"] is not None
    assert body["all_day"] is False
    # Local items are never events, regardless of having a schedule.
    assert body["source"] == "local"
    assert body["is_event"] is False


async def _compile(client, iid: str) -> None:
    r = await client.post(
        f"/api/items/{iid}/compile",
        json={"procedure": "known", "scope": "bounded", "description": "d", "firstAction": "go"},
    )
    assert r.status_code == 200


async def _checkpoint(client, iid: str, outcome: str) -> None:
    r = await client.post(
        f"/api/items/{iid}/checkpoints",
        json={
            "outcome": outcome,
            "last_state": "halfway",
            "next_action": "next",
            "resume_from": "line 10",
        },
    )
    assert r.status_code == 201


async def test_continue_checkpoint_moves_from_ready_to_resumable(client):
    """A compiled unit lives in Ready until it's worked on; a "continue"
    checkpoint (with it off Today) moves it to Resumable and out of Ready."""
    iid = await _capture(client, "parser work")
    await _compile(client, iid)
    assert iid in await _ids(client, "ready")
    assert iid not in await _ids(client, "resumable")

    await _checkpoint(client, iid, "active")
    # Checkpointing sets daily=False already? No — keep it off Today explicitly.
    await client.post(f"/api/items/{iid}/daily", json={"daily": False})

    assert iid in await _ids(client, "resumable")
    assert iid not in await _ids(client, "ready")


async def test_continue_checkpoint_kept_on_today_is_not_resumable(client):
    """Keeping a continued task on Today (daily=True) keeps it on Today, not on
    the Resumable shelf."""
    iid = await _capture(client, "kept on today")
    await _compile(client, iid)
    await _checkpoint(client, iid, "active")
    await client.post(f"/api/items/{iid}/daily", json={"daily": True})

    assert iid in await _ids(client, "today")
    assert iid not in await _ids(client, "resumable")


async def test_deferred_checkpoint_is_not_resumable(client):
    """Only the "continue" (active) outcome lands in Resumable; deferred/blocked
    are different statuses and stay in Ready."""
    iid = await _capture(client, "deferred work")
    await _compile(client, iid)
    await _checkpoint(client, iid, "deferred")
    await client.post(f"/api/items/{iid}/daily", json={"daily": False})

    assert iid not in await _ids(client, "resumable")
    assert iid in await _ids(client, "ready")


async def test_compiled_never_started_is_not_resumable(client):
    """A freshly compiled unit is state=active but never checkpointed — it is
    Ready, not Resumable (the distinguishing signal is a real checkpoint)."""
    iid = await _capture(client, "fresh compile")
    await _compile(client, iid)
    assert iid not in await _ids(client, "resumable")
    assert iid in await _ids(client, "ready")


async def test_untimed_uncompiled_item_surfaces_nowhere(client):
    """Sanity: a plain backlog item with no schedule and no compile is absent
    from both Today and Ready (it lives only in its domain)."""
    iid = await _capture(client, "just an idea")
    assert iid not in await _ids(client, "today")
    assert iid not in await _ids(client, "ready")
