"""Checkpoint domain logic (the resume loop)."""
from __future__ import annotations

import uuid
from collections.abc import Iterable

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Checkpoint, Item
from ..schemas import CheckpointCreate
from .items import rollup


async def latest_checkpoint(
    session: AsyncSession, item_id: uuid.UUID
) -> Checkpoint | None:
    result = await session.execute(
        select(Checkpoint)
        .where(Checkpoint.item_id == item_id)
        .order_by(Checkpoint.created_at.desc(), Checkpoint.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def latest_checkpoints_for(
    session: AsyncSession, item_ids: Iterable[uuid.UUID]
) -> dict[uuid.UUID, Checkpoint]:
    ids = list(item_ids)
    if not ids:
        return {}
    result = await session.execute(
        select(Checkpoint)
        .where(Checkpoint.item_id.in_(ids))
        .order_by(Checkpoint.created_at.desc(), Checkpoint.id.desc())
    )
    newest: dict[uuid.UUID, Checkpoint] = {}
    for cp in result.scalars().all():
        newest.setdefault(cp.item_id, cp)  # first seen is newest
    return newest


async def checkpoint_history(
    session: AsyncSession, item_id: uuid.UUID
) -> list[Checkpoint]:
    result = await session.execute(
        select(Checkpoint)
        .where(Checkpoint.item_id == item_id)
        .order_by(Checkpoint.created_at.desc(), Checkpoint.id.desc())
    )
    return list(result.scalars().all())


async def save_checkpoint(
    session: AsyncSession,
    item: Item,
    payload: CheckpointCreate,
    owner_id: uuid.UUID,
) -> Checkpoint:
    """Append a checkpoint, set the item's state to the outcome, roll up parent.

    A work session is only "closed" when a checkpoint exists. Every text field
    is optional at this layer — the human web flow is toll-free — while the
    agent surface re-imposes last_state / resume_from. Columns are non-null, so
    absent fields are stored as "".
    """
    checkpoint = Checkpoint(
        item_id=item.id,
        outcome=payload.outcome,
        last_state=payload.last_state or "",
        what_changed=payload.what_changed,
        problems=payload.problems,
        next_action=payload.next_action or "",
        resume_from=payload.resume_from or "",
        do_not_redo=payload.do_not_redo,
    )
    session.add(checkpoint)

    item.state = payload.outcome
    if payload.outcome == "done":
        item.daily = False
    if item.parent_id:
        await rollup(session, item.parent_id, owner_id)

    await session.flush()
    return checkpoint
