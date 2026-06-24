"""Account deletion: remove a user and every row that belongs to them.

This is irreversible and runs in a single transaction. We delete explicitly,
owner-scoped, in dependency order rather than leaning only on the database's
``ON DELETE CASCADE`` — so the cleanup is auditable and holds even where foreign
keys aren't enforced. Before the local rows go, we best-effort revoke any Google
OAuth grant so Checkpoint's access to the user's calendar is withdrawn too.
"""
from __future__ import annotations

import logging
import uuid

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from ..models import CalendarConnection, Checkpoint, Domain, Item, Snapshot, User
from .calendar_sync import revoke_token
from .crypto import decrypt

logger = logging.getLogger(__name__)


async def _revoke_calendar_grant(session: AsyncSession, owner_id: uuid.UUID) -> None:
    """Tell Google to drop Checkpoint's access, if a calendar is connected.

    Best-effort: a failure here must never block the user from deleting their
    account — the encrypted tokens are erased locally regardless.
    """
    conn = await session.execute(
        select(CalendarConnection).where(CalendarConnection.owner_id == owner_id)
    )
    conn = conn.scalar_one_or_none()
    if conn is None:
        return
    try:
        await run_in_threadpool(revoke_token, decrypt(conn.refresh_token_enc))
    except Exception:  # noqa: BLE001 - revoke is best-effort cleanup
        logger.warning("Google token revoke failed during account deletion")


async def delete_account(session: AsyncSession, user: User) -> None:
    """Permanently delete ``user`` and all data owned by them.

    Order matters: rows that reference items (checkpoints, snapshots) go first,
    then items, then the user's other top-level rows, then the user. The caller
    commits.
    """
    owner_id = user.id
    await _revoke_calendar_grant(session, owner_id)

    owned_item_ids = select(Item.id).where(Item.owner_id == owner_id)
    await session.execute(
        delete(Checkpoint).where(Checkpoint.item_id.in_(owned_item_ids))
    )
    await session.execute(
        delete(Snapshot).where(Snapshot.item_id.in_(owned_item_ids))
    )
    await session.execute(delete(Item).where(Item.owner_id == owner_id))
    await session.execute(delete(Domain).where(Domain.owner_id == owner_id))
    await session.execute(
        delete(CalendarConnection).where(CalendarConnection.owner_id == owner_id)
    )
    await session.execute(delete(User).where(User.id == owner_id))
