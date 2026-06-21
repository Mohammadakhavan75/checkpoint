"""Item endpoints: list (view filters), CRUD, capture, promote, compile, state, daily."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, not_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..constants import READY_HORIZON_DAYS, RESERVOIR
from ..db import get_session
from ..models import Item, User
from ..schemas import (
    CaptureRequest,
    CompileRequest,
    DailyRequest,
    ItemCreate,
    ItemOut,
    ItemUpdate,
    PromoteRequest,
    StateRequest,
)
from ..services import calendar_sync
from ..services.checkpoints import latest_checkpoints_for
from ..services.domains import ensure_domain
from ..services.items import (
    capture,
    compile_item,
    couple_scout_axes,
    get_children,
    get_item,
    is_parent,
    parent_id_set,
    promote,
    purge_expired_trash,
    restore,
    set_state,
)
from .serializers import serialize_item

router = APIRouter()

# Backlog display order (prototype: viewDomain `order`).
_DOMAIN_ORDER = [
    "active",
    "scout",
    "blocked",
    "needsdef",
    "waiting",
    "idea",
    "deferred",
    "done",
    "killed",
]


def _day_window(tz_name: str | None) -> tuple[datetime, datetime, datetime]:
    """Return ``(today_start, today_end, ready_horizon_end)`` as UTC instants.

    Day boundaries are computed in the user's local zone (``tz_name``, falling
    back to UTC) so "today" matches the user's calendar day rather than the
    server's. ``ready_horizon_end`` is the far edge of the Ready "on deck"
    window: the ``READY_HORIZON_DAYS`` days *after* today.
    """
    try:
        tz: timezone | ZoneInfo = ZoneInfo(tz_name) if tz_name else timezone.utc
    except (ZoneInfoNotFoundError, ValueError):
        tz = timezone.utc
    midnight = datetime.now(tz).replace(hour=0, minute=0, second=0, microsecond=0)
    day0 = midnight
    day1 = midnight + timedelta(days=1)
    horizon = day1 + timedelta(days=READY_HORIZON_DAYS)
    return (
        day0.astimezone(timezone.utc),
        day1.astimezone(timezone.utc),
        horizon.astimezone(timezone.utc),
    )


def _today_clause(day0: datetime, day1: datetime):
    """Items that belong in Today: manually pulled, starting today, or due
    today / overdue. Each branch guards its time column against NULL so the OR
    stays a clean boolean (no three-valued surprises)."""
    return or_(
        Item.daily.is_(True),
        and_(Item.start_at.is_not(None), Item.start_at >= day0, Item.start_at < day1),
        and_(Item.deadline.is_not(None), Item.deadline < day1, Item.state != "done"),
    )


def _ready_clause(day1: datetime, horizon: datetime):
    """Items "on deck" for Ready: already-compiled units, or anything scheduled
    to start / fall due within the upcoming horizon (but not yet today)."""
    return or_(
        Item.compiled.is_(True),
        and_(Item.start_at.is_not(None), Item.start_at >= day1, Item.start_at < horizon),
        and_(Item.deadline.is_not(None), Item.deadline >= day1, Item.deadline < horizon),
    )


def _sched_key(item: Item) -> tuple[int, datetime]:
    """Sort key: scheduled rows first by soonest start/deadline, then the rest
    by creation time. The leading flag keeps the two groups from comparing
    across each other."""
    when = item.start_at or item.deadline
    return (0, when) if when is not None else (1, item.created_at)


async def _serialize_top_level(
    session: AsyncSession,
    rows: list[Item],
    parents: set[uuid.UUID],
) -> list[ItemOut]:
    """Serialize top-level rows for the Today / Ready views.

    A container (a row that has phases) is returned with its phases nested, so
    the whole container moves through Ready → Today as one unit instead of its
    phases scattering across the views. Leaf rows carry their latest checkpoint.
    """
    leaf_ids = [i.id for i in rows if i.id not in parents]
    latest = await latest_checkpoints_for(session, leaf_ids)
    out: list[ItemOut] = []
    for i in rows:
        if i.id in parents:
            kids = await get_children(session, i.id)
            child_latest = await latest_checkpoints_for(session, [k.id for k in kids])
            children = [
                serialize_item(k, is_parent=k.id in parents, latest=child_latest.get(k.id))
                for k in kids
            ]
            out.append(serialize_item(i, is_parent=True, children=children))
        else:
            out.append(serialize_item(i, is_parent=False, latest=latest.get(i.id)))
    return out


@router.get("", response_model=list[ItemOut])
async def list_items(
    tab: str = Query("today"),
    domain: str | None = Query(None),
    tz: str | None = Query(
        None,
        description="IANA timezone (e.g. 'Europe/Berlin') for computing the "
        "Today/Ready date windows. Defaults to UTC.",
    ),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ItemOut]:
    uid = user.id
    # Sweep expired trash on every list so it's purged even if the user never
    # opens the Trash view (commit since this is otherwise a read-only path).
    await purge_expired_trash(session, uid)
    await session.commit()
    parents = await parent_id_set(session, uid)

    if tab == "trash":
        result = await session.execute(
            select(Item)
            .where(Item.owner_id == uid, Item.state == "killed")
            .order_by(Item.deleted_at.desc())
        )
        return [
            serialize_item(i, is_parent=i.id in parents)
            for i in result.scalars().all()
        ]

    day0, day1, horizon = _day_window(tz)

    # Stale-while-revalidate: opening Today/Ready serves the cached rows now and
    # kicks a non-blocking calendar refresh, so the next load reflects Google
    # without ever blocking this request.
    if tab in ("today", "ready"):
        conn = await calendar_sync.get_connection(session, uid)
        if conn is not None and calendar_sync.is_stale(conn):
            calendar_sync.schedule_background_sync(uid)

    if tab == "today":
        # Top-level only: a container rides into Today as one unit (its phases
        # nested), rather than each phase showing as a separate row. Beyond the
        # manually-pulled `daily` rows, items starting today or due today/overdue
        # auto-surface here (date-based surfacing).
        result = await session.execute(
            select(Item).where(
                Item.owner_id == uid,
                Item.state != "killed",
                Item.parent_id.is_(None),
                _today_clause(day0, day1),
            )
        )
        rows = sorted(result.scalars().all(), key=_sched_key)
        return await _serialize_top_level(session, rows, parents)

    if tab == "ready":
        # Compiled-and-waiting units plus anything scheduled within the horizon,
        # minus whatever already qualifies for Today (so a compiled task due
        # today shows only there, not in both).
        result = await session.execute(
            select(Item).where(
                Item.owner_id == uid,
                Item.daily.is_(False),
                Item.state.not_in(["killed", "done"]),
                Item.parent_id.is_(None),
                _ready_clause(day1, horizon),
                not_(_today_clause(day0, day1)),
            )
        )
        rows = sorted(result.scalars().all(), key=_sched_key)
        return await _serialize_top_level(session, rows, parents)

    if tab == "reservoir":
        result = await session.execute(
            select(Item)
            .where(
                Item.owner_id == uid,
                Item.domain == RESERVOIR,
                Item.state != "killed",
            )
            .order_by(Item.created_at.desc())
        )
        return [serialize_item(i, is_parent=i.id in parents) for i in result.scalars().all()]

    if tab == "domain":
        if not domain:
            raise HTTPException(
                status_code=422, detail="domain query param is required for tab=domain"
            )
        result = await session.execute(
            select(Item)
            .where(
                Item.owner_id == uid,
                Item.domain == domain,
                Item.parent_id.is_(None),
                # killed items live in Trash, not the backlog
                Item.state != "killed",
            )
            .order_by(Item.created_at)
        )
        tops = list(result.scalars().all())
        out: list[ItemOut] = []
        for top in tops:
            children: list[ItemOut] = []
            if top.id in parents:
                kids = [
                    k for k in await get_children(session, top.id) if k.state != "killed"
                ]
                child_latest = await latest_checkpoints_for(session, [k.id for k in kids])
                children = [
                    serialize_item(
                        k, is_parent=k.id in parents, latest=child_latest.get(k.id)
                    )
                    for k in kids
                ]
            out.append(serialize_item(top, is_parent=top.id in parents, children=children))
        out.sort(
            key=lambda io: _DOMAIN_ORDER.index(io.state)
            if io.state in _DOMAIN_ORDER
            else len(_DOMAIN_ORDER)
        )
        return out

    raise HTTPException(status_code=422, detail=f"unknown tab {tab!r}")


@router.post("", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
async def create_item(
    payload: ItemCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    item = Item(
        owner_id=user.id,
        title=payload.title,
        domain=payload.domain,
        state=payload.state,
        mode=payload.mode,
        parent_id=payload.parent_id,
        procedure=payload.procedure,
        scope=payload.scope,
        fields=payload.fields or {},
        daily=False,
        compiled=False,
    )
    couple_scout_axes(item)
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return serialize_item(item)


@router.post("/capture", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
async def capture_item(
    payload: CaptureRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    domain = (payload.domain or "").strip()
    if domain and domain != RESERVOIR:
        await ensure_domain(session, user.id, domain)
    item = await capture(session, user.id, payload.text, domain or None)
    await session.commit()
    await session.refresh(item)
    return serialize_item(item)


async def _require_item(
    item_id: uuid.UUID, user: User, session: AsyncSession
) -> Item:
    item = await get_item(session, item_id, user.id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.get("/{item_id}", response_model=ItemOut)
async def get_one(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    item = await _require_item(item_id, user, session)
    parents = await parent_id_set(session, user.id)
    kids = await get_children(session, item.id)
    child_latest = await latest_checkpoints_for(session, [k.id for k in kids])
    children = [
        serialize_item(k, is_parent=k.id in parents, latest=child_latest.get(k.id))
        for k in kids
    ]
    from ..services.checkpoints import latest_checkpoint  # local import avoids cycle noise

    latest = await latest_checkpoint(session, item.id)
    return serialize_item(
        item, is_parent=bool(kids), children=children, latest=latest
    )


@router.patch("/{item_id}", response_model=ItemOut)
async def update_item(
    item_id: uuid.UUID,
    payload: ItemUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    item = await _require_item(item_id, user, session)
    touched = payload.model_dump(exclude_unset=True)
    for key, value in touched.items():
        setattr(item, key, value)
    if "state" in touched or "mode" in touched:
        couple_scout_axes(item)
    await session.commit()
    await session.refresh(item)
    return serialize_item(item, is_parent=await is_parent(session, item.id))


@router.delete("/trash/empty", status_code=status.HTTP_204_NO_CONTENT)
async def empty_trash(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Permanently delete every trashed (killed) item for the user."""
    from sqlalchemy import delete as sa_delete

    await session.execute(
        sa_delete(Item).where(Item.owner_id == user.id, Item.state == "killed")
    )
    await session.commit()


@router.delete("/{item_id}", response_model=ItemOut)
async def delete_item(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    """Move to trash: set state='killed' (cascades to phases for containers).
    Items in trash are restorable and auto-purged after 30 days."""
    item = await _require_item(item_id, user, session)
    await set_state(session, item, "killed")
    await session.commit()
    await session.refresh(item)
    return serialize_item(item, is_parent=await is_parent(session, item.id))


@router.delete("/{item_id}/permanent", status_code=status.HTTP_204_NO_CONTENT)
async def permanently_delete_item(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    """Hard delete a single item now (FK cascade clears phases/checkpoints)."""
    item = await _require_item(item_id, user, session)
    await session.delete(item)
    await session.commit()


@router.post("/{item_id}/restore", response_model=ItemOut)
async def restore_item(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    """Bring an item back from trash to the state it had before deletion."""
    item = await _require_item(item_id, user, session)
    await restore(session, item)
    await session.commit()
    await session.refresh(item)
    return serialize_item(item, is_parent=await is_parent(session, item.id))


@router.post("/{item_id}/promote", response_model=ItemOut)
async def promote_item(
    item_id: uuid.UUID,
    payload: PromoteRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    item = await _require_item(item_id, user, session)
    await ensure_domain(session, user.id, payload.domain)
    await promote(session, item, payload.domain)
    await session.commit()
    await session.refresh(item)
    return serialize_item(item)


@router.post("/{item_id}/compile", response_model=ItemOut)
async def compile_endpoint(
    item_id: uuid.UUID,
    payload: CompileRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    item = await _require_item(item_id, user, session)
    await compile_item(session, item, payload, user.id)
    await session.commit()
    await session.refresh(item)
    parents = await parent_id_set(session, user.id)
    kids = await get_children(session, item.id)
    children = [serialize_item(k, is_parent=k.id in parents) for k in kids]
    return serialize_item(item, is_parent=bool(kids), children=children)


@router.post("/{item_id}/state", response_model=ItemOut)
async def set_state_endpoint(
    item_id: uuid.UUID,
    payload: StateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    item = await _require_item(item_id, user, session)
    await set_state(session, item, payload.state)
    await session.commit()
    await session.refresh(item)
    return serialize_item(item, is_parent=await is_parent(session, item.id))


@router.post("/{item_id}/daily", response_model=ItemOut)
async def set_daily_endpoint(
    item_id: uuid.UUID,
    payload: DailyRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    item = await _require_item(item_id, user, session)
    item.daily = payload.daily
    await session.commit()
    await session.refresh(item)
    return serialize_item(item, is_parent=await is_parent(session, item.id))
