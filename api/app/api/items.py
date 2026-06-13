"""Item endpoints: list (view filters), CRUD, capture, promote, compile, state, daily."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..constants import RESERVOIR
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
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[ItemOut]:
    uid = user.id
    parents = await parent_id_set(session, uid)

    if tab == "today":
        # Top-level only: a container rides into Today as one unit (its phases
        # nested), rather than each phase showing as a separate row.
        result = await session.execute(
            select(Item).where(
                Item.owner_id == uid,
                Item.daily.is_(True),
                Item.state != "killed",
                Item.parent_id.is_(None),
            )
        )
        return await _serialize_top_level(session, list(result.scalars().all()), parents)

    if tab == "ready":
        # Same as Today: containers appear as whole units, phases stay nested.
        result = await session.execute(
            select(Item).where(
                Item.owner_id == uid,
                Item.compiled.is_(True),
                Item.daily.is_(False),
                Item.state.not_in(["killed", "done"]),
                Item.parent_id.is_(None),
            )
        )
        return await _serialize_top_level(session, list(result.scalars().all()), parents)

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
            )
            .order_by(Item.created_at)
        )
        tops = list(result.scalars().all())
        out: list[ItemOut] = []
        for top in tops:
            children: list[ItemOut] = []
            if top.id in parents:
                kids = await get_children(session, top.id)
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


@router.delete("/{item_id}", response_model=ItemOut)
async def delete_item(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> ItemOut:
    """Soft delete: set state='killed' (cascades to phases for containers)."""
    item = await _require_item(item_id, user, session)
    await set_state(session, item, "killed")
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
