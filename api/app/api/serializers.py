"""Helpers to assemble ORM rows into ItemOut/CheckpointOut response models."""
from __future__ import annotations

from ..models import Checkpoint, Item
from ..schemas import CheckpointOut, ItemOut


def serialize_item(
    item: Item,
    *,
    is_parent: bool = False,
    children: list[ItemOut] | None = None,
    latest: Checkpoint | None = None,
) -> ItemOut:
    return ItemOut(
        id=item.id,
        owner_id=item.owner_id,
        parent_id=item.parent_id,
        title=item.title,
        domain=item.domain,
        state=item.state,
        mode=item.mode,
        daily=item.daily,
        compiled=item.compiled,
        procedure=item.procedure,
        scope=item.scope,
        fields=item.fields or {},
        is_tutorial=item.is_tutorial,
        deleted_at=item.deleted_at,
        start_at=item.start_at,
        end_at=item.end_at,
        deadline=item.deadline,
        all_day=item.all_day,
        source=item.source,
        created_at=item.created_at,
        updated_at=item.updated_at,
        is_parent=is_parent,
        is_event=item.source == "gcal",
        children=children or [],
        latest_checkpoint=CheckpointOut.model_validate(latest) if latest else None,
    )
