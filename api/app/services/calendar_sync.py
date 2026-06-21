"""Read-only Google Calendar mirror: OAuth code exchange + event reconciliation.

The network boundary is a handful of small module-level functions
(``exchange_code``, ``refresh_access_token_remote``, ``fetch_events_page``, …)
that wrap ``requests``; tests monkeypatch them, mirroring ``google_auth``. The
async functions are pure DB logic on top.

The co-ownership rule (see GOOGLE_CALENDAR_INTEGRATION.md): for a mirrored
``source='gcal'`` item, Google owns title/time and the user owns the work
(daily, compiled, domain, state, checkpoints). ``reconcile_event`` overwrites
only Google's half.
"""
from __future__ import annotations

import asyncio
import logging
import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from ..config import settings
from ..constants import CALENDAR, READY_HORIZON_DAYS
from ..models import CalendarConnection, Item
from .checkpoints import latest_checkpoint
from .crypto import decrypt, encrypt
from .items import set_state

logger = logging.getLogger(__name__)

_TOKEN_URL = "https://oauth2.googleapis.com/token"
_REVOKE_URL = "https://oauth2.googleapis.com/revoke"
_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
_CAL_BASE = "https://www.googleapis.com/calendar/v3/calendars"
# How far back/forward the first (window-bounded) sync reaches.
_SYNC_PAST_DAYS = 1


class CalendarError(Exception):
    """A calendar operation failed in a way the user can't fix by retrying."""


class CalendarUnavailable(CalendarError):
    """Google could not be reached — transient; the API answers 503."""


class CalendarReauthRequired(CalendarError):
    """The refresh token was rejected (revoked/expired) — the user must
    reconnect. The connection is marked ``reauth_required`` before this raises."""


class SyncTokenExpired(Exception):
    """Google returned 410 Gone for the stored syncToken — do a full resync."""


# --------------------------------------------------------------------------- #
# Network boundary (monkeypatched in tests). All synchronous `requests` calls;
# callers wrap them in run_in_threadpool so the event loop stays unblocked.
# --------------------------------------------------------------------------- #
def _post_token(data: dict) -> dict:
    import requests

    try:
        resp = requests.post(_TOKEN_URL, data=data, timeout=15)
    except requests.RequestException as exc:  # network/DNS/timeout
        raise CalendarUnavailable("Could not reach Google") from exc
    if resp.status_code >= 400:
        body = _safe_json(resp)
        if body.get("error") in ("invalid_grant", "unauthorized_client"):
            raise CalendarReauthRequired(body.get("error_description") or "invalid_grant")
        raise CalendarError(f"Google token endpoint {resp.status_code}: {body}")
    return resp.json()


def exchange_code(code: str, redirect_uri: str) -> dict:
    """Trade an authorization code for tokens (server-side, with the secret)."""
    return _post_token(
        {
            "code": code,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        }
    )


def refresh_access_token_remote(refresh_token: str) -> dict:
    return _post_token(
        {
            "refresh_token": refresh_token,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "grant_type": "refresh_token",
        }
    )


def _api_get(url: str, access_token: str, params: dict | None = None) -> dict:
    import requests

    try:
        resp = requests.get(
            url,
            headers={"Authorization": f"Bearer {access_token}"},
            params=params or {},
            timeout=20,
        )
    except requests.RequestException as exc:
        raise CalendarUnavailable("Could not reach Google Calendar") from exc
    if resp.status_code == 410:
        raise SyncTokenExpired()
    if resp.status_code in (401, 403):
        raise CalendarReauthRequired(f"Calendar API {resp.status_code}")
    if resp.status_code >= 400:
        raise CalendarError(f"Calendar API {resp.status_code}: {_safe_json(resp)}")
    return resp.json()


def fetch_userinfo(access_token: str) -> dict:
    return _api_get(_USERINFO_URL, access_token)


def fetch_time_zone(access_token: str, calendar_id: str) -> str | None:
    data = _api_get(f"{_CAL_BASE}/{calendar_id}", access_token)
    return data.get("timeZone")


def fetch_events_page(access_token: str, calendar_id: str, params: dict) -> dict:
    return _api_get(f"{_CAL_BASE}/{calendar_id}/events", access_token, params)


def revoke_token(token: str) -> None:
    import requests

    try:
        requests.post(_REVOKE_URL, data={"token": token}, timeout=15)
    except requests.RequestException as exc:  # best-effort; local row is removed anyway
        logger.warning("Google token revoke failed: %s", exc)


def _safe_json(resp) -> dict:
    try:
        return resp.json()
    except Exception:  # noqa: BLE001
        return {"raw": resp.text[:200]}


# --------------------------------------------------------------------------- #
# Time parsing
# --------------------------------------------------------------------------- #
def _as_utc(dt: datetime | None) -> datetime | None:
    """Treat a naive timestamp as UTC. SQLite (dev/tests) drops tzinfo on round
    trip; Postgres timestamptz keeps it. This makes comparisons work on both."""
    if dt is None:
        return None
    return dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)


def _safe_zone(tz_name: str | None):
    try:
        return ZoneInfo(tz_name) if tz_name else timezone.utc
    except (ZoneInfoNotFoundError, ValueError):
        return timezone.utc


def _parse_endpoint(obj: dict | None, tz_name: str | None) -> tuple[datetime | None, bool]:
    """Parse a Google event start/end object → (instant, all_day)."""
    if not obj:
        return None, False
    if obj.get("dateTime"):
        # ISO-8601 with offset (or trailing Z, which fromisoformat handles on 3.11+).
        return datetime.fromisoformat(obj["dateTime"].replace("Z", "+00:00")), False
    if obj.get("date"):
        d = date.fromisoformat(obj["date"])
        zone = _safe_zone(obj.get("timeZone") or tz_name)
        return datetime(d.year, d.month, d.day, tzinfo=zone), True
    return None, False


# --------------------------------------------------------------------------- #
# DB logic
# --------------------------------------------------------------------------- #
async def get_connection(
    session: AsyncSession, owner_id: uuid.UUID
) -> CalendarConnection | None:
    result = await session.execute(
        select(CalendarConnection).where(CalendarConnection.owner_id == owner_id)
    )
    return result.scalar_one_or_none()


async def _get_by_external(
    session: AsyncSession, owner_id: uuid.UUID, external_id: str
) -> Item | None:
    result = await session.execute(
        select(Item).where(
            Item.owner_id == owner_id,
            Item.source == "gcal",
            Item.external_id == external_id,
        )
    )
    return result.scalar_one_or_none()


async def _has_user_work(session: AsyncSession, item: Item) -> bool:
    """Has the user invested anything in this mirrored event? If so a
    cancellation trashes it (preserving history) instead of hard-deleting."""
    if item.compiled or item.daily:
        return True
    return await latest_checkpoint(session, item.id) is not None


async def ensure_access_token(session: AsyncSession, conn: CalendarConnection) -> str:
    """Return a valid access token, refreshing (and re-caching) if expired."""
    now = datetime.now(timezone.utc)
    expires_at = _as_utc(conn.access_expires_at)
    if (
        conn.access_token_enc
        and expires_at
        and expires_at > now + timedelta(seconds=30)
    ):
        return decrypt(conn.access_token_enc)
    try:
        tok = await run_in_threadpool(
            refresh_access_token_remote, decrypt(conn.refresh_token_enc)
        )
    except CalendarReauthRequired:
        conn.status = "reauth_required"
        conn.last_error = "Google rejected the saved authorization"
        raise
    conn.access_token_enc = encrypt(tok["access_token"])
    conn.access_expires_at = now + timedelta(seconds=int(tok.get("expires_in", 3600)))
    return tok["access_token"]


async def reconcile_event(
    session: AsyncSession, conn: CalendarConnection, ev: dict
) -> str:
    """Upsert one Google event into items. Returns 'added'|'updated'|'removed'|'noop'."""
    external_id = ev.get("id")
    if not external_id:
        return "noop"
    existing = await _get_by_external(session, conn.owner_id, external_id)

    if ev.get("status") == "cancelled":
        if existing is None:
            return "noop"
        if await _has_user_work(session, existing):
            await set_state(session, existing, "killed")  # trash, keep history
            existing.fields = {**(existing.fields or {}), "googleStatus": "cancelled"}
        else:
            await session.delete(existing)
        return "removed"

    start, all_day = _parse_endpoint(ev.get("start"), conn.time_zone)
    end, _ = _parse_endpoint(ev.get("end"), conn.time_zone)
    title = (ev.get("summary") or "(untitled event)").strip()
    etag = ev.get("etag")
    updated = ev.get("updated")
    updated_dt = (
        datetime.fromisoformat(updated.replace("Z", "+00:00")) if updated else None
    )
    google_fields = {
        "htmlLink": ev.get("htmlLink"),
        "location": ev.get("location"),
        "calendarId": conn.calendar_id,
        "googleStatus": ev.get("status") or "confirmed",
    }

    if existing is None:
        session.add(
            Item(
                owner_id=conn.owner_id,
                title=title,
                domain=CALENDAR,
                state="needsdef",
                daily=False,
                compiled=False,
                source="gcal",
                external_id=external_id,
                external_etag=etag,
                external_updated_at=updated_dt,
                start_at=start,
                end_at=end,
                all_day=all_day,
                fields=google_fields,
            )
        )
        return "added"

    if existing.external_etag and existing.external_etag == etag:
        return "noop"  # unchanged since last sync

    # Overwrite ONLY Google-owned fields; never touch the user's half.
    existing.title = title
    existing.start_at = start
    existing.end_at = end
    existing.all_day = all_day
    existing.external_etag = etag
    existing.external_updated_at = updated_dt
    existing.fields = {**(existing.fields or {}), **google_fields}
    return "updated"


def _sync_window() -> tuple[str, str]:
    now = datetime.now(timezone.utc)
    time_min = (now - timedelta(days=_SYNC_PAST_DAYS)).isoformat()
    time_max = (now + timedelta(days=READY_HORIZON_DAYS + 1)).isoformat()
    return time_min, time_max


async def sync_connection(session: AsyncSession, conn: CalendarConnection) -> dict:
    """Pull events and reconcile them. Incremental via syncToken when present;
    a 410 (expired token) restarts as a full window sync. Returns tallies."""
    access = await ensure_access_token(session, conn)
    tally = {"added": 0, "updated": 0, "removed": 0}

    base: dict = {"singleEvents": "true", "showDeleted": "true", "maxResults": 250}
    if conn.sync_token:
        base["syncToken"] = conn.sync_token
    else:
        time_min, time_max = _sync_window()
        base["timeMin"] = time_min
        base["timeMax"] = time_max

    page_token: str | None = None
    next_sync_token: str | None = None
    while True:
        params = dict(base)
        if page_token:
            params["pageToken"] = page_token
        try:
            page = await run_in_threadpool(
                fetch_events_page, access, conn.calendar_id, params
            )
        except SyncTokenExpired:
            conn.sync_token = None
            return await sync_connection(session, conn)  # restart full

        for ev in page.get("items", []):
            outcome = await reconcile_event(session, conn, ev)
            if outcome in tally:
                tally[outcome] += 1

        next_sync_token = page.get("nextSyncToken") or next_sync_token
        page_token = page.get("nextPageToken")
        if not page_token:
            break

    if next_sync_token:
        conn.sync_token = next_sync_token
    conn.last_synced_at = datetime.now(timezone.utc)
    conn.status = "active"
    conn.last_error = None
    return tally


async def connect(
    session: AsyncSession, owner_id: uuid.UUID, code: str, redirect_uri: str
) -> CalendarConnection:
    """Exchange an auth code, store the (encrypted) tokens, and run a first sync."""
    tokens = await run_in_threadpool(exchange_code, code, redirect_uri)
    refresh = tokens.get("refresh_token")
    if not refresh:
        # No refresh token means Google didn't grant offline access (often a
        # re-auth without consent). Ask the user to reconnect with consent.
        raise CalendarReauthRequired(
            "Google did not return a refresh token — reconnect and approve access"
        )
    access = tokens["access_token"]
    info = await run_in_threadpool(fetch_userinfo, access)
    time_zone = await run_in_threadpool(fetch_time_zone, access, "primary")

    conn = await get_connection(session, owner_id)
    if conn is None:
        conn = CalendarConnection(owner_id=owner_id, calendar_id="primary")
        session.add(conn)
    conn.google_sub = info.get("sub")
    conn.google_email = info.get("email")
    conn.refresh_token_enc = encrypt(refresh)
    conn.access_token_enc = encrypt(access)
    conn.access_expires_at = datetime.now(timezone.utc) + timedelta(
        seconds=int(tokens.get("expires_in", 3600))
    )
    conn.scope = tokens.get("scope")
    conn.time_zone = time_zone
    conn.status = "active"
    conn.last_error = None
    conn.sync_token = None  # a fresh connection always full-syncs
    await session.flush()
    await sync_connection(session, conn)
    return conn


# --------------------------------------------------------------------------- #
# Stale-while-revalidate: a list request can kick a background refresh instead
# of blocking. No external queue — just an in-process asyncio task with a
# per-user lock. Safe under a single uvicorn worker (the compose setup); scale
# to many workers ⇒ replace the lock with a Postgres advisory lock.
# --------------------------------------------------------------------------- #
_sync_locks: dict[uuid.UUID, asyncio.Lock] = {}
_bg_tasks: set[asyncio.Task] = set()


def is_stale(conn: CalendarConnection) -> bool:
    """Whether an active connection is due for a refresh."""
    if conn.status != "active":
        return False  # reauth_required/disabled: don't auto-hammer Google
    last = _as_utc(conn.last_synced_at)
    if last is None:
        return True
    age = (datetime.now(timezone.utc) - last).total_seconds()
    return age > settings.calendar_sync_ttl_seconds


def _lock_for(owner_id: uuid.UUID) -> asyncio.Lock:
    lock = _sync_locks.get(owner_id)
    if lock is None:
        lock = _sync_locks[owner_id] = asyncio.Lock()
    return lock


async def background_sync(owner_id: uuid.UUID) -> None:
    """Refresh one user's calendar on its own DB session. Swallows errors —
    a background refresh must never surface as a failed request."""
    lock = _lock_for(owner_id)
    if lock.locked():
        return  # a sync for this user is already in flight
    async with lock:
        from ..db import SessionLocal

        async with SessionLocal() as session:
            conn = await get_connection(session, owner_id)
            if conn is None or conn.status != "active":
                return
            try:
                await sync_connection(session, conn)
                await session.commit()
            except CalendarReauthRequired:
                await session.commit()  # persist the status flip
            except CalendarError as exc:
                conn.last_error = str(exc)[:500]
                await session.commit()
            except Exception:  # noqa: BLE001 - last-resort guard for a detached task
                logger.exception("background calendar sync failed")
                await session.rollback()


def schedule_background_sync(owner_id: uuid.UUID) -> None:
    """Fire-and-forget a refresh, keeping a strong task ref so it isn't GC'd."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:  # no loop (shouldn't happen in request context)
        return
    task = loop.create_task(background_sync(owner_id))
    _bg_tasks.add(task)
    task.add_done_callback(_bg_tasks.discard)


async def disconnect(
    session: AsyncSession, conn: CalendarConnection, *, keep_events: bool
) -> None:
    """Revoke upstream and remove the connection. Mirrored events are either
    frozen into plain local items (keep) or removed when untouched (drop)."""
    try:
        await run_in_threadpool(revoke_token, decrypt(conn.refresh_token_enc))
    except CalendarError:
        pass  # local cleanup proceeds regardless

    result = await session.execute(
        select(Item).where(Item.owner_id == conn.owner_id, Item.source == "gcal")
    )
    for item in result.scalars().all():
        if keep_events or await _has_user_work(session, item):
            # Detach from Google: it becomes an ordinary local item the user keeps.
            item.source = "local"
            item.external_id = None
            item.external_etag = None
            item.external_updated_at = None
        else:
            await session.delete(item)

    await session.delete(conn)
