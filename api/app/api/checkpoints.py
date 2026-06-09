"""Checkpoint endpoints: history (newest first) and append."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..db import get_session
from ..models import User
from ..schemas import CheckpointCreate, CheckpointOut
from ..services.checkpoints import checkpoint_history, save_checkpoint
from ..services.items import get_item

router = APIRouter()


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
    response_model=CheckpointOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_checkpoint(
    item_id: uuid.UUID,
    payload: CheckpointCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CheckpointOut:
    item = await get_item(session, item_id, user.id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    checkpoint = await save_checkpoint(session, item, payload, user.id)
    await session.commit()
    await session.refresh(checkpoint)
    return CheckpointOut.model_validate(checkpoint)
