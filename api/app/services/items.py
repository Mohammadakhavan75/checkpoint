"""Item domain logic ported from brain_os.html.

Integrity rules (rollup, cascade, compile) live here next to the database,
not in the client. Every function is scoped by ``owner_id``.
"""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..constants import CLASS_MODE, RESERVOIR
from ..models import Item
from ..schemas import CompileRequest, PhaseInput


async def get_item(
    session: AsyncSession, item_id: uuid.UUID, owner_id: uuid.UUID
) -> Item | None:
    result = await session.execute(
        select(Item).where(Item.id == item_id, Item.owner_id == owner_id)
    )
    return result.scalar_one_or_none()


async def get_children(session: AsyncSession, parent_id: uuid.UUID) -> list[Item]:
    """Children of an item (prototype: ``kids(id)``)."""
    result = await session.execute(
        select(Item).where(Item.parent_id == parent_id).order_by(Item.created_at)
    )
    return list(result.scalars().all())


async def is_parent(session: AsyncSession, item_id: uuid.UUID) -> bool:
    result = await session.execute(
        select(Item.id).where(Item.parent_id == item_id).limit(1)
    )
    return result.first() is not None


async def parent_id_set(session: AsyncSession, owner_id: uuid.UUID) -> set[uuid.UUID]:
    """Set of item ids (for this owner) that have at least one child."""
    result = await session.execute(
        select(Item.parent_id)
        .where(Item.owner_id == owner_id, Item.parent_id.is_not(None))
        .distinct()
    )
    return {row[0] for row in result.all()}


async def rollup(session: AsyncSession, parent_id: uuid.UUID, owner_id: uuid.UUID) -> None:
    """Recompute a container's state from its phases (prototype: ``rollup``)."""
    if not parent_id:
        return
    parent = await get_item(session, parent_id, owner_id)
    if parent is None:
        return
    children = await get_children(session, parent_id)
    if not children:
        return
    done = sum(1 for c in children if c.state == "done")
    resolved = sum(1 for c in children if c.state in ("done", "killed"))
    if done == len(children):
        parent.state = "done"
    elif resolved == len(children):
        parent.state = "deferred"
    elif any(c.state in ("active", "scout") for c in children):
        parent.state = "active"


def couple_scout_axes(item: Item) -> None:
    """"Needs reconnaissance" lives on both axes — the scout *state* and the
    Scout *mode* — so keep them from contradicting each other: the scout state
    implies Scout mode, and starting work on a Scout-mode item means scouting,
    not executing (rule: unknown task → scout, do not execute)."""
    if item.state == "scout":
        item.mode = "Scout"
    elif item.state == "active" and item.mode == "Scout":
        item.state = "scout"


async def set_state(session: AsyncSession, item: Item, state: str) -> Item:
    """Set state; containers cascade kill/done/defer to phases; roll up parent."""
    item.state = state
    couple_scout_axes(item)
    children = await get_children(session, item.id)
    if children and state in ("killed", "done", "deferred"):
        for child in children:
            child.state = state
    if item.parent_id:
        await rollup(session, item.parent_id, item.owner_id)
    return item


async def capture(
    session: AsyncSession,
    owner_id: uuid.UUID,
    text: str,
    domain: str | None = None,
) -> Item:
    """Quick-capture a new item.

    By default lands in the reservoir as a parked ``idea``. When ``domain`` is
    given (and isn't the reservoir), the item skips the reservoir and lands
    directly in that domain as ``needsdef`` — the same end state as promoting a
    brain rot, but in a single step ("Fast Task Domain").
    """
    target = (domain or "").strip()
    direct = bool(target) and target != RESERVOIR
    item = Item(
        owner_id=owner_id,
        title=text.strip(),
        domain=target if direct else RESERVOIR,
        state="needsdef" if direct else "idea",
        daily=False,
        compiled=False,
        fields={},
    )
    session.add(item)
    await session.flush()
    return item


async def promote(session: AsyncSession, item: Item, domain: str) -> Item:
    """Move a reservoir idea into a real domain as needsdef."""
    item.domain = domain
    item.state = "needsdef"
    return item


def _derive_mode(procedure: str | None, scope: str | None) -> str | None:
    if procedure and scope:
        mode = CLASS_MODE.get(f"{procedure}|{scope}", "")
        return mode or None
    return None


async def _reconcile_phases(
    session: AsyncSession,
    parent: Item,
    phases: list[PhaseInput],
    owner_id: uuid.UUID,
) -> None:
    """Create/update/delete phase children of a container (prototype: reconcileSubs)."""
    keep: set[uuid.UUID] = set()
    for phase in phases:
        title = (phase.title or "").strip()
        if not title:
            continue
        first_action = (phase.firstAction or "").strip()
        child: Item | None = None
        if phase.id:
            child = await get_item(session, phase.id, owner_id)
            if child is not None and child.parent_id != parent.id:
                child = None  # only reconcile our own phases
        if child is not None:
            child.title = title
            child.domain = parent.domain
            child.fields = {**(child.fields or {}), "firstAction": first_action, "description": title}
            child.compiled = bool(first_action)
            if child.compiled and child.state in ("idea", "needsdef"):
                child.state = "active"
            if not child.compiled and child.state not in ("done", "killed"):
                child.state = "needsdef"
            keep.add(child.id)
        else:
            new_child = Item(
                owner_id=parent.owner_id,
                parent_id=parent.id,
                title=title,
                domain=parent.domain,
                state="active" if first_action else "needsdef",
                mode="Do",
                daily=False,
                compiled=bool(first_action),
                procedure="known",
                scope="bounded",
                fields={
                    "description": title,
                    "firstAction": first_action,
                    "risk": "",
                    "resumeFrom": "",
                },
            )
            session.add(new_child)
            await session.flush()
            keep.add(new_child.id)

    for child in await get_children(session, parent.id):
        if child.id not in keep:
            await session.delete(child)


async def compile_item(
    session: AsyncSession,
    item: Item,
    payload: CompileRequest,
    owner_id: uuid.UUID,
) -> Item:
    """Turn an item into a resumable unit (prototype: saveCompile)."""
    if payload.title is not None and payload.title.strip():
        item.title = payload.title.strip()
    fields = dict(item.fields or {})
    if payload.description is not None:
        fields["description"] = payload.description
    if payload.firstAction is not None:
        fields["firstAction"] = payload.firstAction
    if payload.risk is not None:
        fields["risk"] = payload.risk

    if payload.procedure is not None:
        item.procedure = payload.procedure
    if payload.scope is not None:
        item.scope = payload.scope

    # Classification sets the mode; an explicit mode in the payload wins.
    derived = _derive_mode(item.procedure, item.scope)
    if derived is not None:
        item.mode = derived
    if payload.mode is not None:
        item.mode = payload.mode

    existing_children = await get_children(session, item.id)
    titled_phases = [p for p in (payload.phases or []) if (p.title or "").strip()]
    is_time_trap = item.procedure == "known" and item.scope == "unbounded"
    is_container = item.parent_id is None and (
        is_time_trap or bool(existing_children) or bool(titled_phases)
    )

    if is_container:
        await _reconcile_phases(session, item, titled_phases, owner_id)
        item.compiled = True
        item.daily = False
        fields["firstAction"] = ""  # a pure container is not directly executable
        item.fields = fields
        await rollup(session, item.id, owner_id)
        if item.state not in ("done", "killed", "active"):
            item.state = "active"
    else:
        item.fields = fields
        item.compiled = True
        if item.state in ("idea", "needsdef"):
            item.state = "scout" if item.mode == "Scout" else "active"
        elif item.state == "scout" and item.mode != "Scout":
            # classification says the procedure is known now — scouting is over
            item.state = "active"
        elif item.state == "active" and item.mode == "Scout":
            # first move still unknown — sessions on this are reconnaissance
            item.state = "scout"
        if item.parent_id:
            await rollup(session, item.parent_id, owner_id)

    return item
