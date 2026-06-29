"""Reminder & Web Push endpoints (ADR-001).

Three concerns under one router (mounted at /api):
  * /push/*      — VAPID public key + subscription lifecycle (grant/revoke).
  * /reminders   — task-set one-shot reminders (CRUD).
  * /settings    — per-user reminder preferences.

All owner-scoped via ``get_current_user``, matching the existing routers.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..config import settings as app_settings
from ..db import get_session
from ..models import PushSubscription, Reminder, User
from ..schemas import (
    PushSubscriptionCreate,
    PushSubscriptionOut,
    ReminderCreate,
    ReminderOut,
    SettingsOut,
    SettingsUpdate,
    VapidKeyOut,
)
from ..services import crypto, push
from ..services.items import get_item
from ..services.reminders import get_or_create_settings

router = APIRouter()


def _require_available() -> None:
    if not app_settings.reminders_available:
        raise HTTPException(
            status_code=503,
            detail="Reminders are not configured on this server",
        )


# --- web push subscriptions --------------------------------------------------


@router.get("/push/vapid-public-key", response_model=VapidKeyOut)
async def vapid_public_key() -> VapidKeyOut:
    _require_available()
    return VapidKeyOut(key=app_settings.vapid_public_key)


@router.get("/push/subscriptions", response_model=list[PushSubscriptionOut])
async def list_subscriptions(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[PushSubscription]:
    rows = (
        (
            await session.execute(
                select(PushSubscription)
                .where(PushSubscription.owner_id == user.id)
                .order_by(PushSubscription.created_at.desc())
            )
        )
        .scalars()
        .all()
    )
    return list(rows)


@router.post(
    "/push/subscriptions",
    response_model=PushSubscriptionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_subscription(
    payload: PushSubscriptionCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> PushSubscription:
    _require_available()
    digest = push.endpoint_hash(payload.endpoint)
    # Re-subscribing the same browser is idempotent: update the keys in place.
    existing = (
        await session.execute(
            select(PushSubscription).where(
                PushSubscription.owner_id == user.id,
                PushSubscription.endpoint_hash == digest,
            )
        )
    ).scalar_one_or_none()
    if existing is not None:
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = payload.user_agent
        existing.failed_at = None
        await session.commit()
        await session.refresh(existing)
        return existing

    sub = PushSubscription(
        owner_id=user.id,
        endpoint_enc=crypto.encrypt(payload.endpoint),
        endpoint_hash=digest,
        p256dh=payload.keys.p256dh,
        auth=payload.keys.auth,
        user_agent=payload.user_agent,
    )
    session.add(sub)
    await session.commit()
    await session.refresh(sub)
    return sub


@router.delete(
    "/push/subscriptions/{sub_id}", status_code=status.HTTP_204_NO_CONTENT
)
async def delete_subscription(
    sub_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    sub = (
        await session.execute(
            select(PushSubscription).where(
                PushSubscription.id == sub_id,
                PushSubscription.owner_id == user.id,
            )
        )
    ).scalar_one_or_none()
    if sub is None:
        return  # idempotent
    await session.delete(sub)
    await session.commit()


# --- task reminders ----------------------------------------------------------


@router.get("/reminders", response_model=list[ReminderOut])
async def list_reminders(
    item_id: uuid.UUID | None = Query(None),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Reminder]:
    q = select(Reminder).where(Reminder.owner_id == user.id)
    if item_id is not None:
        q = q.where(Reminder.item_id == item_id)
    q = q.order_by(Reminder.fire_at)
    rows = (await session.execute(q)).scalars().all()
    return list(rows)


@router.post(
    "/reminders", response_model=ReminderOut, status_code=status.HTTP_201_CREATED
)
async def create_reminder(
    payload: ReminderCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Reminder:
    item = await get_item(session, payload.item_id, user.id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    fire_at = payload.fire_at
    if fire_at.tzinfo is None:
        fire_at = fire_at.replace(tzinfo=timezone.utc)
    if fire_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=422, detail="fire_at must be in the future")

    reminder = Reminder(
        owner_id=user.id,
        item_id=item.id,
        fire_at=fire_at,
        kind=payload.kind,
        status="pending",
    )
    session.add(reminder)
    await session.commit()
    await session.refresh(reminder)
    return reminder


@router.delete("/reminders/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_reminder(
    reminder_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    reminder = (
        await session.execute(
            select(Reminder).where(
                Reminder.id == reminder_id, Reminder.owner_id == user.id
            )
        )
    ).scalar_one_or_none()
    if reminder is None:
        return  # idempotent
    await session.delete(reminder)
    await session.commit()


# --- per-user settings -------------------------------------------------------


@router.get("/settings", response_model=SettingsOut)
async def get_settings(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SettingsOut:
    row = await get_or_create_settings(session, user.id)
    await session.commit()
    return SettingsOut.model_validate(row)


@router.patch("/settings", response_model=SettingsOut)
async def update_settings(
    payload: SettingsUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SettingsOut:
    row = await get_or_create_settings(session, user.id)
    data = payload.model_dump(exclude_unset=True)
    for field in (
        "reminders_enabled",
        "nudge_opt_in",
        "time_zone",
        "quiet_hours_start",
        "quiet_hours_end",
    ):
        if field in data:
            value = data[field]
            # Empty strings clear the optional text prefs.
            if field in ("quiet_hours_start", "quiet_hours_end", "time_zone") and value == "":
                value = None
            setattr(row, field, value)
    await session.commit()
    await session.refresh(row)
    return SettingsOut.model_validate(row)
