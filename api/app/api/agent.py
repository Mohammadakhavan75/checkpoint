"""Agent API (MCP v0): orient / item detail / checkpoint / capture.

Four endpoints, PAT-auth only (agent_auth.get_agent_user). Design rules
(docs/product/OBJECT_PERMANENCE_MCP.md):
  * receipts, not transcripts — no chat logs are ever stored;
  * the agent fills the Reservoir; only the human crosses the compiled barrier
    (no compile/promote/edit/delete surface exists here);
  * item state moves only via checkpoint outcomes (save_checkpoint service),
    the same rule the human lives under.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..agent_auth import get_agent_user
from ..constants import CALENDAR, RESERVOIR
from ..db import get_session
from ..models import Domain, Item, Snapshot, User
from ..schemas import (
    AgentCaptureOut,
    AgentCaptureRequest,
    AgentItemDetail,
    AgentItemSummary,
    AgentOrientOut,
    AgentPhaseOut,
    AgentSnapshotOut,
    CheckpointCreate,
    CheckpointOut,
)
from ..services.checkpoints import (
    checkpoint_history,
    latest_checkpoints_for,
    save_checkpoint,
)
from ..services.items import capture, get_children, get_item

router = APIRouter()

# Returned by orient so every session re-reads the working agreement.
PROTOCOL = (
    "Checkpoint agent protocol: work one phase at a time. After finishing a "
    "phase, immediately save_checkpoint on that phase (outcome=done) — never "
    "batch phases into one receipt. If the item has no phases, checkpoint "
    "outcome=active at natural seams (implementation compiles, tests pass) so "
    "an interrupted session still leaves a trail. A done receipt records what "
    "happened: what_changed is required (do_not_redo when relevant). When "
    "stopping or interrupted mid-work, save_checkpoint with outcome "
    "active/blocked/deferred, a concrete resume_from (file paths, commands, "
    "ids — never vague prose), and a next_action. Park stray ideas with "
    "capture. Never reorganize the backlog; compiling is the human's job."
)

_OPEN_STATES_EXCLUDED = ("done", "killed")


def _summary(
    item: Item,
    children: list[Item],
    latest: dict[uuid.UUID, object],
) -> AgentItemSummary:
    """Newest receipt across the item and its phases wins."""
    candidates = [latest.get(item.id)] + [latest.get(c.id) for c in children]
    candidates = [c for c in candidates if c is not None]
    newest = max(candidates, key=lambda c: c.created_at) if candidates else None
    return AgentItemSummary(
        id=item.id,
        title=item.title,
        domain=item.domain,
        state=item.state,
        compiled=item.compiled,
        is_parent=bool(children),
        phases_total=len(children),
        phases_done=sum(1 for c in children if c.state == "done"),
        latest_checkpoint=(
            CheckpointOut.model_validate(newest) if newest else None
        ),
    )


@router.get("/orient", response_model=AgentOrientOut)
async def orient(
    domain: str | None = None,
    limit: int = 10,
    user: User = Depends(get_agent_user),
    session: AsyncSession = Depends(get_session),
) -> AgentOrientOut:
    limit = max(1, min(limit, 25))

    stmt = select(Item).where(
        Item.owner_id == user.id,
        Item.parent_id.is_(None),
        Item.is_tutorial.is_(False),
        Item.deleted_at.is_(None),
        Item.source == "local",
        Item.state.notin_(_OPEN_STATES_EXCLUDED),
        Item.domain.notin_((RESERVOIR, CALENDAR)),
    )
    if domain:
        stmt = stmt.where(Item.domain == domain)
    items = list((await session.execute(stmt)).scalars().all())

    by_parent: dict[uuid.UUID, list[Item]] = {}
    if items:
        result = await session.execute(
            select(Item).where(
                Item.owner_id == user.id,
                Item.parent_id.in_([i.id for i in items]),
            )
        )
        for child in result.scalars().all():
            by_parent.setdefault(child.parent_id, []).append(child)

    all_ids = [i.id for i in items] + [
        c.id for kids in by_parent.values() for c in kids
    ]
    latest = await latest_checkpoints_for(session, all_ids)

    summaries = [_summary(i, by_parent.get(i.id, []), latest) for i in items]
    # Freshest thread first: newest receipt, else newest item update.
    lookup = {s.id: i for s, i in zip(summaries, items)}
    summaries.sort(
        key=lambda s: (
            s.latest_checkpoint.created_at
            if s.latest_checkpoint
            else lookup[s.id].updated_at
        ),
        reverse=True,
    )

    domains = [
        row[0]
        for row in (
            await session.execute(
                select(Domain.name)
                .where(Domain.owner_id == user.id)
                .order_by(Domain.name)
            )
        ).all()
    ]
    reservoir_count = (
        await session.execute(
            select(func.count())
            .select_from(Item)
            .where(
                Item.owner_id == user.id,
                Item.domain == RESERVOIR,
                Item.deleted_at.is_(None),
                Item.state.notin_(_OPEN_STATES_EXCLUDED),
            )
        )
    ).scalar_one()

    return AgentOrientOut(
        user_name=user.name or user.email,
        server_time=datetime.now(timezone.utc),
        protocol=PROTOCOL,
        domains=domains,
        reservoir_count=reservoir_count or 0,
        items=summaries[:limit],
    )


@router.get("/items/{item_id}", response_model=AgentItemDetail)
async def item_detail(
    item_id: uuid.UUID,
    user: User = Depends(get_agent_user),
    session: AsyncSession = Depends(get_session),
) -> AgentItemDetail:
    item = await get_item(session, item_id, user.id)
    if item is None or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Item not found")

    children = await get_children(session, item.id, user.id)
    latest = await latest_checkpoints_for(
        session, [item.id] + [c.id for c in children]
    )
    history = await checkpoint_history(session, item.id)
    snapshots = list(
        (
            await session.execute(
                select(Snapshot)
                .where(Snapshot.item_id == item.id)
                .order_by(Snapshot.created_at.desc())
                .limit(3)
            )
        )
        .scalars()
        .all()
    )

    fields = item.fields or {}
    return AgentItemDetail(
        id=item.id,
        title=item.title,
        domain=item.domain,
        state=item.state,
        mode=item.mode,
        compiled=item.compiled,
        procedure=item.procedure,
        scope=item.scope,
        description=fields.get("description", "") or "",
        first_action=fields.get("firstAction", "") or "",
        deadline=item.deadline,
        start_at=item.start_at,
        end_at=item.end_at,
        phases=[
            AgentPhaseOut(
                id=c.id,
                title=c.title,
                state=c.state,
                compiled=c.compiled,
                first_action=(c.fields or {}).get("firstAction", "") or "",
                latest_checkpoint=(
                    CheckpointOut.model_validate(latest[c.id])
                    if c.id in latest
                    else None
                ),
            )
            for c in children
        ],
        checkpoints=[CheckpointOut.model_validate(cp) for cp in history[:5]],
        snapshots=[AgentSnapshotOut.model_validate(s) for s in snapshots],
    )


@router.post(
    "/items/{item_id}/checkpoints",
    response_model=CheckpointOut,
    status_code=status.HTTP_201_CREATED,
)
async def agent_checkpoint(
    item_id: uuid.UUID,
    payload: CheckpointCreate,
    user: User = Depends(get_agent_user),
    session: AsyncSession = Depends(get_session),
) -> CheckpointOut:
    item = await get_item(session, item_id, user.id)
    if item is None or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Item not found")
    # The resume contract used to live on CheckpointCreate, but the human web
    # flow is now toll-free; the ledger enforces it on the agent surface only,
    # so an agent receipt still points the next session somewhere concrete.
    if not (payload.last_state or "").strip():
        raise HTTPException(
            status_code=422,
            detail="last_state is required — one line on where things stand.",
        )
    if payload.outcome != "done" and not (payload.resume_from or "").strip():
        raise HTTPException(
            status_code=422,
            detail="resume_from is required unless outcome is done.",
        )
    # A done receipt is the record of what happened, not a bare state flip.
    # Agent-surface rule only — the human's web flow stays toll-free.
    if payload.outcome == "done" and not (payload.what_changed or "").strip():
        raise HTTPException(
            status_code=422,
            detail=(
                "A done receipt must record what happened — fill what_changed "
                "(and do_not_redo when relevant), then retry."
            ),
        )
    checkpoint = await save_checkpoint(session, item, payload, user.id)
    await session.commit()
    await session.refresh(checkpoint)
    return CheckpointOut.model_validate(checkpoint)


@router.post(
    "/capture",
    response_model=AgentCaptureOut,
    status_code=status.HTTP_201_CREATED,
)
async def agent_capture(
    payload: AgentCaptureRequest,
    user: User = Depends(get_agent_user),
    session: AsyncSession = Depends(get_session),
) -> AgentCaptureOut:
    domain = (payload.domain or "").strip() or None
    if domain:
        known = [
            row[0]
            for row in (
                await session.execute(
                    select(Domain.name).where(Domain.owner_id == user.id)
                )
            ).all()
        ]
        if domain not in known:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Unknown domain {domain!r}. Use one of: "
                    f"{', '.join(sorted(known)) or '(none yet)'} — or omit "
                    "domain to capture into the reservoir."
                ),
            )
    item = await capture(session, user.id, payload.text, domain)
    await session.commit()
    return AgentCaptureOut(
        id=item.id, title=item.title, domain=item.domain, state=item.state
    )
