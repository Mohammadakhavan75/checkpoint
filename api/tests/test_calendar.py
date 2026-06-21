"""Google Calendar mirror: reconciliation ownership-split, sync, connect/disconnect.

The network boundary in services/calendar_sync is monkeypatched (no real HTTP),
the same way test_google_auth stubs credential verification.
"""
from __future__ import annotations

import uuid

import pytest
import pytest_asyncio
from cryptography.fernet import Fernet

from app.config import settings
from app.constants import CALENDAR
from app.models import CalendarConnection, Checkpoint
from app.services import calendar_sync, crypto


def _event(eid: str, *, summary: str = "Standup", etag: str = "e1", status: str = "confirmed", **extra):
    ev = {
        "id": eid,
        "status": status,
        "summary": summary,
        "etag": etag,
        "updated": "2026-06-21T08:00:00Z",
        "htmlLink": f"https://cal/{eid}",
        "start": {"dateTime": "2026-06-21T09:00:00+00:00"},
        "end": {"dateTime": "2026-06-21T09:30:00+00:00"},
    }
    ev.update(extra)
    return ev


@pytest.fixture
def enc_key():
    """A real Fernet key for token encryption, with the cached cipher reset so
    later tests don't pin a stale key."""
    settings.token_encryption_key = Fernet.generate_key().decode()
    crypto._fernet.cache_clear()
    yield
    settings.token_encryption_key = ""
    crypto._fernet.cache_clear()


@pytest_asyncio.fixture
async def conn(session, user):
    c = CalendarConnection(
        owner_id=user.id,
        calendar_id="primary",
        time_zone="UTC",
        refresh_token_enc="x",  # not decrypted in reconcile/sync tests
    )
    session.add(c)
    await session.flush()
    return c


# --------------------------- reconcile_event --------------------------------- #
async def test_reconcile_adds_event_as_gcal_item(session, conn):
    out = await calendar_sync.reconcile_event(session, conn, _event("ev1"))
    await session.flush()
    assert out == "added"
    item = await calendar_sync._get_by_external(session, conn.owner_id, "ev1")
    assert item is not None
    assert item.source == "gcal"
    assert item.domain == CALENDAR
    assert item.title == "Standup"
    assert item.start_at is not None and item.end_at is not None
    assert item.fields["htmlLink"] == "https://cal/ev1"


async def test_reconcile_update_preserves_user_work(session, conn):
    await calendar_sync.reconcile_event(session, conn, _event("ev1", etag="e1"))
    await session.flush()
    item = await calendar_sync._get_by_external(session, conn.owner_id, "ev1")
    # the user invests in it: pulls to Today and compiles it
    item.daily = True
    item.compiled = True
    item.domain = "DDWS"
    await session.flush()

    out = await calendar_sync.reconcile_event(
        session, conn, _event("ev1", summary="Standup (moved)", etag="e2")
    )
    await session.flush()
    assert out == "updated"
    await session.refresh(item)
    # Google's half changed...
    assert item.title == "Standup (moved)"
    assert item.external_etag == "e2"
    # ...the user's half is untouched.
    assert item.daily is True
    assert item.compiled is True
    assert item.domain == "DDWS"


async def test_reconcile_unchanged_etag_is_noop(session, conn):
    await calendar_sync.reconcile_event(session, conn, _event("ev1", etag="e1"))
    await session.flush()
    out = await calendar_sync.reconcile_event(session, conn, _event("ev1", etag="e1"))
    assert out == "noop"


async def test_reconcile_cancelled_untouched_deletes(session, conn):
    await calendar_sync.reconcile_event(session, conn, _event("ev1"))
    await session.flush()
    out = await calendar_sync.reconcile_event(
        session, conn, {"id": "ev1", "status": "cancelled"}
    )
    await session.flush()
    assert out == "removed"
    assert await calendar_sync._get_by_external(session, conn.owner_id, "ev1") is None


async def test_reconcile_cancelled_with_checkpoint_trashes_keeping_history(session, conn):
    await calendar_sync.reconcile_event(session, conn, _event("ev1"))
    await session.flush()
    item = await calendar_sync._get_by_external(session, conn.owner_id, "ev1")
    session.add(
        Checkpoint(
            item_id=item.id,
            outcome="active",
            last_state="active",
            next_action="n",
            resume_from="here",
        )
    )
    await session.flush()

    out = await calendar_sync.reconcile_event(
        session, conn, {"id": "ev1", "status": "cancelled"}
    )
    await session.flush()
    assert out == "removed"
    await session.refresh(item)
    assert item.state == "killed"  # trashed, not hard-deleted
    assert item.fields["googleStatus"] == "cancelled"


# --------------------------- sync_connection --------------------------------- #
async def test_sync_full_stores_sync_token(session, conn, monkeypatch):
    async def fake_token(_session, _conn):
        return "access"

    monkeypatch.setattr(calendar_sync, "ensure_access_token", fake_token)
    monkeypatch.setattr(
        calendar_sync,
        "fetch_events_page",
        lambda access, cal, params: {
            "items": [_event("ev1"), _event("ev2", summary="Review")],
            "nextSyncToken": "tok-1",
        },
    )
    tally = await calendar_sync.sync_connection(session, conn)
    assert tally["added"] == 2
    assert conn.sync_token == "tok-1"
    assert conn.status == "active"
    assert conn.last_synced_at is not None


async def test_sync_expired_token_restarts_full(session, conn, monkeypatch):
    conn.sync_token = "stale"

    async def fake_token(_session, _conn):
        return "access"

    def fake_page(access, cal, params):
        if "syncToken" in params:
            raise calendar_sync.SyncTokenExpired()
        return {"items": [_event("ev1")], "nextSyncToken": "tok-fresh"}

    monkeypatch.setattr(calendar_sync, "ensure_access_token", fake_token)
    monkeypatch.setattr(calendar_sync, "fetch_events_page", fake_page)

    tally = await calendar_sync.sync_connection(session, conn)
    assert tally["added"] == 1
    assert conn.sync_token == "tok-fresh"


# --------------------------- connect / disconnect API ------------------------ #
@pytest.fixture
def calendar_configured(enc_key):
    settings.google_client_id = "cid"
    settings.google_client_secret = "secret"
    yield
    settings.google_client_id = ""
    settings.google_client_secret = ""


async def test_connect_then_status_then_disconnect(client, monkeypatch, calendar_configured):
    monkeypatch.setattr(
        calendar_sync,
        "exchange_code",
        lambda code, redirect: {
            "access_token": "at",
            "refresh_token": "rt",
            "expires_in": 3600,
            "scope": "calendar.readonly",
        },
    )
    monkeypatch.setattr(
        calendar_sync, "fetch_userinfo", lambda at: {"sub": "g-1", "email": "cal@example.com"}
    )
    monkeypatch.setattr(calendar_sync, "fetch_time_zone", lambda at, cal: "Europe/Berlin")
    monkeypatch.setattr(
        calendar_sync,
        "fetch_events_page",
        lambda at, cal, params: {"items": [_event("ev1")], "nextSyncToken": "t1"},
    )
    monkeypatch.setattr(calendar_sync, "revoke_token", lambda token: None)

    # not connected yet
    r = await client.get("/api/integrations/google-calendar")
    assert r.json()["connected"] is False

    # connect
    r = await client.post(
        "/api/integrations/google-calendar/connect", json={"code": "auth-code"}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["connected"] is True
    assert body["email"] == "cal@example.com"

    # the event was mirrored into the calendar domain
    r = await client.get("/api/items", params={"tab": "domain", "domain": CALENDAR})
    assert any(i["is_event"] for i in r.json())

    # disconnect (keep events) → connection gone, event frozen to a local item
    r = await client.delete("/api/integrations/google-calendar")
    assert r.status_code == 204
    r = await client.get("/api/integrations/google-calendar")
    assert r.json()["connected"] is False
    r = await client.get("/api/items", params={"tab": "domain", "domain": CALENDAR})
    kept = r.json()
    assert len(kept) == 1
    assert kept[0]["source"] == "local"
    assert kept[0]["is_event"] is False


async def test_sync_now_without_connection_404(client):
    r = await client.post("/api/integrations/google-calendar/sync")
    assert r.status_code == 404


async def test_connect_disabled_when_unconfigured(client):
    # no client id / secret / key configured → connect refused with 503
    r = await client.post(
        "/api/integrations/google-calendar/connect", json={"code": "x"}
    )
    assert r.status_code == 503


# --------------------------- stale-while-revalidate -------------------------- #
async def test_stale_connection_triggers_background_sync(client, session, user, monkeypatch):
    import datetime as _dt

    calls: list = []
    monkeypatch.setattr(calendar_sync, "schedule_background_sync", calls.append)
    old = _dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(hours=2)
    session.add(
        CalendarConnection(
            owner_id=user.id, refresh_token_enc="x", status="active", last_synced_at=old
        )
    )
    await session.commit()

    r = await client.get("/api/items", params={"tab": "today"})
    assert r.status_code == 200
    assert calls == [user.id]


async def test_fresh_connection_skips_background_sync(client, session, user, monkeypatch):
    import datetime as _dt

    calls: list = []
    monkeypatch.setattr(calendar_sync, "schedule_background_sync", calls.append)
    session.add(
        CalendarConnection(
            owner_id=user.id,
            refresh_token_enc="x",
            status="active",
            last_synced_at=_dt.datetime.now(_dt.timezone.utc),
        )
    )
    await session.commit()

    await client.get("/api/items", params={"tab": "ready"})
    assert calls == []


async def test_reauth_required_connection_is_not_stale():
    import datetime as _dt

    conn = CalendarConnection(
        owner_id=uuid.uuid4(),
        refresh_token_enc="x",
        status="reauth_required",
        last_synced_at=_dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=1),
    )
    # a connection needing reauth must not be auto-synced (we'd just hammer 401s)
    assert calendar_sync.is_stale(conn) is False
