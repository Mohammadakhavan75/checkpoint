"""Reminder domain logic: the testable home of the ADR-001 / RETURN_CUE_NUDGE
policy, plus the minute-resolution ``tick`` the lifespan loop drives.

Two reminder types share one delivery pipe (``services/push.py``):
  * task reminder — a ``reminders`` row with an absolute ``fire_at``; fires once.
  * resume nudge  — computed daily from existing data, ≤1/day, silence + back-off.

The dark-pattern guardrails live here as plain functions so they're unit-testable
(``pytest``) instead of bash comments: carry value not demand, ≤1 nudge/day,
silence when empty, skip if already returned today, back off / never escalate,
no time-shaming, and never fire a reminder for finished/abandoned work.
"""
from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Checkpoint, Item, Reminder, UserSettings
from . import push

# Resume-nudge back-off (mirrors the v0 nudge script defaults). After this many
# consecutive ignored nudges, drop from daily to one every INTERVAL days.
NUDGE_BACKOFF_AFTER = 3
NUDGE_BACKOFF_INTERVAL_DAYS = 7

# States for which a reminder is noise, not a gift — finished or abandoned work.
SUPPRESSED_ITEM_STATES = {"done", "killed"}


# --- helpers -----------------------------------------------------------------


def _as_utc(dt: datetime) -> datetime:
    """Treat a naive timestamp as UTC (SQLite stores naive; Postgres tz-aware)."""
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def _zone(tz_name: str | None) -> ZoneInfo | timezone:
    try:
        return ZoneInfo(tz_name) if tz_name else timezone.utc
    except (ZoneInfoNotFoundError, ValueError):
        return timezone.utc


def _local(now: datetime, tz_name: str | None) -> datetime:
    return _as_utc(now).astimezone(_zone(tz_name))


def _parse_hhmm(value: str | None) -> tuple[int, int] | None:
    if not value:
        return None
    try:
        h, m = value.split(":")
        return int(h), int(m)
    except (ValueError, AttributeError):
        return None


async def get_or_create_settings(
    session: AsyncSession, owner_id: uuid.UUID
) -> UserSettings:
    row = (
        await session.execute(
            select(UserSettings).where(UserSettings.owner_id == owner_id)
        )
    ).scalar_one_or_none()
    if row is None:
        row = UserSettings(owner_id=owner_id, nudge_state={})
        session.add(row)
        await session.flush()
    return row


# --- pure policy (unit-testable without a DB) --------------------------------


def reminder_allowed(item: Item | None) -> bool:
    """A reminder fires only for live work. Finished, killed, or trashed items
    are suppressed — a ping for work you've closed is exactly the noise that
    erodes trust in the channel."""
    if item is None:
        return False
    if item.deleted_at is not None:
        return False
    return item.state not in SUPPRESSED_ITEM_STATES


def in_quiet_hours(settings: UserSettings, now: datetime) -> bool:
    """Is ``now`` inside the user's local quiet-hours window? Supports windows
    that wrap midnight (e.g. 22:00–07:00). A reminder due inside the window is
    deferred (left pending) by the caller, never dropped."""
    start = _parse_hhmm(settings.quiet_hours_start)
    end = _parse_hhmm(settings.quiet_hours_end)
    if not start or not end or start == end:
        return False
    local = _local(now, settings.time_zone)
    cur = local.hour * 60 + local.minute
    lo = start[0] * 60 + start[1]
    hi = end[0] * 60 + end[1]
    if lo < hi:
        return lo <= cur < hi
    # wraps midnight
    return cur >= lo or cur < hi


# --- DB-touching evaluation --------------------------------------------------


async def _checkpoints_on_or_after(
    session: AsyncSession, owner_id: uuid.UUID, day: date, tz_name: str | None
) -> int:
    """Count the user's checkpoints whose *local* date is >= ``day`` — the
    "did they return" signal."""
    rows = (
        await session.execute(
            select(Checkpoint.created_at)
            .join(Item, Item.id == Checkpoint.item_id)
            .where(Item.owner_id == owner_id)
        )
    ).scalars().all()
    return sum(1 for ts in rows if _local(ts, tz_name).date() >= day)


async def freshest_open_thread(
    session: AsyncSession, owner_id: uuid.UUID
) -> tuple[Item, Checkpoint] | None:
    """The single freshest resumable thread: the most recently checkpointed
    non-``done``, non-tutorial, non-trashed item + that checkpoint. This is the
    nudge's gift (same query the v0 script and the Today letter card use)."""
    row = (
        await session.execute(
            select(Item, Checkpoint)
            .join(Checkpoint, Checkpoint.item_id == Item.id)
            .where(
                Item.owner_id == owner_id,
                Item.is_tutorial.is_(False),
                Item.state != "done",
                Item.deleted_at.is_(None),
            )
            .order_by(Checkpoint.created_at.desc(), Checkpoint.id.desc())
            .limit(1)
        )
    ).first()
    return (row[0], row[1]) if row else None


async def evaluate_nudge(
    session: AsyncSession, settings: UserSettings, now: datetime
) -> tuple[bool, tuple[Item, Checkpoint] | None]:
    """Decide whether the resume nudge may fire now, applying every silence /
    back-off rule. Mutates ``settings.nudge_state`` to reset the back-off counter
    when a return is detected, but records nothing about *sending* (the caller
    does that only if it actually pushes). Returns (should_send, thread)."""
    if not (settings.reminders_enabled and settings.nudge_opt_in):
        return False, None
    if in_quiet_hours(settings, now):
        return False, None

    tz = settings.time_zone
    today = _local(now, tz).date()
    state = dict(settings.nudge_state or {})
    last_sent = state.get("last_sent_date")
    unreturned = int(state.get("consecutive_unreturned", 0))

    # ≤ 1 nudge/day (hard cap).
    if last_sent == today.isoformat():
        return False, None

    # Skip if already returned today — you're in the loop; reset back-off.
    if await _checkpoints_on_or_after(session, settings.owner_id, today, tz) > 0:
        state["consecutive_unreturned"] = 0
        settings.nudge_state = state
        return False, None

    # Returned since the last nudge? Reset the back-off counter.
    if last_sent:
        try:
            last_day = date.fromisoformat(last_sent)
            after = last_day + timedelta(days=1)
            if await _checkpoints_on_or_after(session, settings.owner_id, after, tz) > 0:
                unreturned = 0
                state["consecutive_unreturned"] = 0
                settings.nudge_state = state
        except ValueError:
            pass

    # Back off, never escalate: once ignored repeatedly, drop daily -> weekly.
    if unreturned >= NUDGE_BACKOFF_AFTER and last_sent:
        try:
            days_since = (today - date.fromisoformat(last_sent)).days
            if days_since < NUDGE_BACKOFF_INTERVAL_DAYS:
                return False, None
        except ValueError:
            pass

    # Silence when empty: nothing open -> send nothing.
    thread = await freshest_open_thread(session, settings.owner_id)
    if thread is None:
        return False, None
    return True, thread


def _record_nudge_sent(settings: UserSettings, now: datetime) -> None:
    today = _local(now, settings.time_zone).date()
    state = dict(settings.nudge_state or {})
    state["last_sent_date"] = today.isoformat()
    state["consecutive_unreturned"] = int(state.get("consecutive_unreturned", 0)) + 1
    settings.nudge_state = state


# --- payloads (content is a design artifact; see REMINDER_NOTIFICATIONS_UI) ---


def task_payload(item: Item, checkpoint: Checkpoint | None) -> dict:
    hint = checkpoint.resume_from if (checkpoint and checkpoint.resume_from) else None
    body = "you asked to be reminded — only if you feel up to it"
    if hint:
        body += f"\npick up from: {hint}"
    return {
        "title": f"⟲ {item.title}",
        "body": body,
        "data": {"url": f"/?resume={item.id}"},
    }


def nudge_payload(item: Item, checkpoint: Checkpoint) -> dict:
    body = f"{item.title} — pick up from: {checkpoint.resume_from}"
    if checkpoint.next_action:
        body += f"\nfirst move: {checkpoint.next_action}"
    return {
        "title": "⟲ Where you left off",
        "body": body,
        "data": {"url": f"/?resume={item.id}"},
    }


# --- the tick (driven by the lifespan loop; a plain callable for testing) -----


async def tick(session: AsyncSession, now: datetime | None = None) -> dict[str, int]:
    """Fire due task reminders and the resume nudge. Idempotent per reminder
    (claims pending -> sent in-session before pushing). Returns a small tally.
    The caller commits."""
    now = _as_utc(now or datetime.now(timezone.utc))
    tally = {"reminders_fired": 0, "reminders_suppressed": 0, "nudges": 0}

    # 1) Task reminders that are due.
    due = (
        (
            await session.execute(
                select(Reminder)
                .where(Reminder.status == "pending", Reminder.fire_at <= now)
                .order_by(Reminder.fire_at)
            )
        )
        .scalars()
        .all()
    )
    for r in due:
        settings = await get_or_create_settings(session, r.owner_id)
        # Quiet hours: hold (leave pending) so it fires once the window ends.
        if in_quiet_hours(settings, now):
            continue
        item = await session.get(Item, r.item_id)
        # Claim first (dedupe): the row is now spent whatever happens next.
        r.status = "sent"
        r.sent_at = now
        if not reminder_allowed(item):
            tally["reminders_suppressed"] += 1
            continue
        if not settings.reminders_enabled:
            # Off-app pushes disabled; the in-app surface handles it. Don't push.
            tally["reminders_suppressed"] += 1
            continue
        cp = (
            await session.execute(
                select(Checkpoint)
                .where(Checkpoint.item_id == item.id)
                .order_by(Checkpoint.created_at.desc(), Checkpoint.id.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        await push.send_to_owner(session, r.owner_id, task_payload(item, cp))
        tally["reminders_fired"] += 1

    # 2) Resume nudge — at most one per opted-in user per day.
    opted_in = (
        (
            await session.execute(
                select(UserSettings).where(
                    UserSettings.reminders_enabled.is_(True),
                    UserSettings.nudge_opt_in.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )
    for settings in opted_in:
        should_send, thread = await evaluate_nudge(session, settings, now)
        if not should_send or thread is None:
            continue
        item, cp = thread
        await push.send_to_owner(session, settings.owner_id, nudge_payload(item, cp))
        _record_nudge_sent(settings, now)
        tally["nudges"] += 1

    return tally


async def catch_up(
    session: AsyncSession, grace_minutes: int, now: datetime | None = None
) -> dict[str, int]:
    """Startup sweep: silently retire reminders overdue by more than the grace
    window (a stale "do this now" is noise), then run a normal tick so anything
    within grace still fires. Punctuality is sacrificed across a restart;
    delivery is not."""
    now = _as_utc(now or datetime.now(timezone.utc))
    cutoff = now - timedelta(minutes=grace_minutes)
    await session.execute(
        update(Reminder)
        .where(Reminder.status == "pending", Reminder.fire_at < cutoff)
        .values(status="sent", sent_at=now)
    )
    return await tick(session, now)
