"""Integration endpoints: connect / sync / disconnect a Google Calendar."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..config import settings
from ..db import get_session
from ..models import CalendarConnection, User
from ..schemas import CalendarConnectRequest, CalendarStatusOut, CalendarSyncResult
from ..services import calendar_sync
from ..services.calendar_sync import (
    CalendarError,
    CalendarReauthRequired,
    CalendarUnavailable,
)

router = APIRouter()


def _status(conn: CalendarConnection | None) -> CalendarStatusOut:
    if conn is None:
        return CalendarStatusOut(connected=False)
    return CalendarStatusOut(
        connected=True,
        email=conn.google_email,
        calendar_id=conn.calendar_id,
        time_zone=conn.time_zone,
        status=conn.status,
        last_synced_at=conn.last_synced_at,
    )


def _require_enabled() -> None:
    if not settings.calendar_connect_enabled:
        raise HTTPException(
            status_code=503,
            detail="Google Calendar connect is not configured on this server",
        )


@router.get("/google-calendar", response_model=CalendarStatusOut)
async def calendar_status(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CalendarStatusOut:
    conn = await calendar_sync.get_connection(session, user.id)
    return _status(conn)


@router.post("/google-calendar/connect", response_model=CalendarStatusOut)
async def calendar_connect(
    payload: CalendarConnectRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CalendarStatusOut:
    _require_enabled()
    try:
        conn = await calendar_sync.connect(
            session, user.id, payload.code, payload.redirect_uri
        )
        await session.commit()
    except CalendarReauthRequired as exc:
        await session.commit()  # persist the reauth_required status if it was set
        raise HTTPException(status_code=409, detail=str(exc))
    except CalendarUnavailable:
        raise HTTPException(
            status_code=503, detail="Google Calendar is temporarily unavailable"
        )
    except CalendarError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    await session.refresh(conn)
    return _status(conn)


@router.post("/google-calendar/sync", response_model=CalendarSyncResult)
async def calendar_sync_now(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> CalendarSyncResult:
    conn = await calendar_sync.get_connection(session, user.id)
    if conn is None:
        raise HTTPException(status_code=404, detail="No calendar connected")
    try:
        tally = await calendar_sync.sync_connection(session, conn)
        await session.commit()
    except CalendarReauthRequired as exc:
        await session.commit()
        raise HTTPException(status_code=409, detail=str(exc))
    except CalendarUnavailable:
        raise HTTPException(
            status_code=503, detail="Google Calendar is temporarily unavailable"
        )
    except CalendarError as exc:
        raise HTTPException(status_code=502, detail=str(exc))
    await session.refresh(conn)
    return CalendarSyncResult(**tally, last_synced_at=conn.last_synced_at)


@router.delete("/google-calendar", status_code=status.HTTP_204_NO_CONTENT)
async def calendar_disconnect(
    keep_events: bool = Query(
        True, description="Keep mirrored events as plain local tasks (default)."
    ),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    conn = await calendar_sync.get_connection(session, user.id)
    if conn is None:
        return  # already disconnected — idempotent
    await calendar_sync.disconnect(session, conn, keep_events=keep_events)
    await session.commit()
