"""Checkpoint endpoints: history (newest first) and append."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..db import get_session
from ..models import Checkpoint, Item, User
from ..schemas import CheckpointCreate, CheckpointCreatedOut, CheckpointOut
from ..services.checkpoints import checkpoint_history, save_checkpoint
from ..services.items import get_item

router = APIRouter()


async def _user_authored_checkpoints_exist(
    session: AsyncSession, owner_id: uuid.UUID
) -> bool:
    """Has this user ever saved a checkpoint of their own? Checkpoints on
    tutorial items (the seeded receipt) don't count."""
    result = await session.execute(
        select(func.count())
        .select_from(Checkpoint)
        .join(Item, Checkpoint.item_id == Item.id)
        .where(Item.owner_id == owner_id, Item.is_tutorial.is_(False))
    )
    return (result.scalar_one() or 0) > 0


@router.get("/{item_id}/checkpoints", response_model=list[CheckpointOut])
async def list_checkpoints(
    item_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[CheckpointOut]:
    item = await get_item(session, item_id, user.id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    history = await checkpoint_history(session, item.id)
    return [CheckpointOut.model_validate(cp) for cp in history]


@router.post(
    "/{item_id}/checkpoints",
    response_model=CheckpointCreatedOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_checkpoint(
    item_id: uuid.UUID,
    payload: CheckpointCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CheckpointCreatedOut:
    item = await get_item(session, item_id, user.id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    # Checked before the insert: true only when this save is the user's very
    # first self-authored checkpoint (drives the one-time reveal).
    first = not item.is_tutorial and not await _user_authored_checkpoints_exist(
        session, user.id
    )
    checkpoint = await save_checkpoint(session, item, payload, user.id)
    await session.commit()
    await session.refresh(checkpoint)
    out = CheckpointCreatedOut.model_validate(checkpoint)
    out.first_user_checkpoint = first
    return out
