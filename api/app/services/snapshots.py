"""Snapshot domain logic: freeform notes/links the user attaches to an item."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Item, Snapshot
from ..schemas import SnapshotCreate


async def snapshot_history(
    session: AsyncSession, item_id: uuid.UUID
) -> list[Snapshot]:
    result = await session.execute(
        select(Snapshot)
        .where(Snapshot.item_id == item_id)
        .order_by(Snapshot.created_at.desc(), Snapshot.id.desc())
    )
    return list(result.scalars().all())


async def get_snapshot(
    session: AsyncSession, snapshot_id: uuid.UUID, item_id: uuid.UUID
) -> Snapshot | None:
    result = await session.execute(
        select(Snapshot).where(
            Snapshot.id == snapshot_id, Snapshot.item_id == item_id
        )
    )
    return result.scalar_one_or_none()


def _clean(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


async def save_snapshot(
    session: AsyncSession, item: Item, payload: SnapshotCreate
) -> Snapshot:
    snapshot = Snapshot(
        item_id=item.id,
        title=_clean(payload.title),
        note=_clean(payload.note),
        url=_clean(payload.url),
    )
    session.add(snapshot)
    await session.flush()
    return snapshot


async def delete_snapshot(session: AsyncSession, snapshot: Snapshot) -> None:
    await session.delete(snapshot)
