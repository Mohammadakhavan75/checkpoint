"""Snapshot endpoints: list (newest first), append, and delete.

A snapshot is freeform context (a note and/or a link) the user keeps with an
item. It is intentionally optional — unlike a checkpoint, it does not gate
closing a session.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..db import get_session
from ..models import User
from ..schemas import SnapshotCreate, SnapshotOut
from ..services.items import get_item
from ..services.snapshots import (
    delete_snapshot,
    get_snapshot,
    save_snapshot,
    snapshot_history,
)

router = APIRouter()


@router.get("/{item_id}/snapshots", response_model=list[SnapshotOut])
async def list_snapshots(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[SnapshotOut]:
    item = await get_item(session, item_id, user.id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    history = await snapshot_history(session, item.id)
    return [SnapshotOut.model_validate(s) for s in history]


@router.post(
    "/{item_id}/snapshots",
    response_model=SnapshotOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_snapshot(
    item_id: uuid.UUID,
    payload: SnapshotCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SnapshotOut:
    item = await get_item(session, item_id, user.id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    snapshot = await save_snapshot(session, item, payload)
    await session.commit()
    await session.refresh(snapshot)
    return SnapshotOut.model_validate(snapshot)


@router.delete(
    "/{item_id}/snapshots/{snapshot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_snapshot(
    item_id: uuid.UUID,
    snapshot_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    item = await get_item(session, item_id, user.id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    snapshot = await get_snapshot(session, snapshot_id, item.id)
    if snapshot is None:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    await delete_snapshot(session, snapshot)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
