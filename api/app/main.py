"""FastAPI application: router mounting, CORS, optional seed-on-start."""
from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import ai, auth, checkpoints, domains, integrations, items, reminders, snapshots
from .config import settings

logger = logging.getLogger(__name__)


async def _reminder_scheduler() -> None:
    """Minute-resolution loop that fires due reminders + the resume nudge
    (ADR-001 Option A). State is durable in Postgres, so a restart loses
    punctuality, not delivery; a startup catch-up sweep covers the gap. One DB
    error never kills the loop — it logs and waits for the next tick."""
    from .db import SessionLocal
    from .services import reminders as reminders_service

    # Startup catch-up: fire anything overdue within the grace window, retire
    # anything older silently.
    try:
        async with SessionLocal() as session:
            await reminders_service.catch_up(
                session, settings.reminder_catchup_grace_minutes
            )
            await session.commit()
    except Exception:  # pragma: no cover - defensive
        logger.exception("reminder catch-up failed")

    while True:
        await asyncio.sleep(settings.reminder_tick_seconds)
        try:
            async with SessionLocal() as session:
                await reminders_service.tick(session)
                await session.commit()
        except asyncio.CancelledError:
            raise
        except Exception:  # pragma: no cover - keep the loop alive
            logger.exception("reminder tick failed")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.seed_on_start:
        from .seed import seed

        await seed()

    task: asyncio.Task | None = None
    if settings.reminders_available:
        task = asyncio.create_task(_reminder_scheduler())
    try:
        yield
    finally:
        if task is not None:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(title="Checkpoint API", version="0.16.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(domains.router, prefix="/api/domains", tags=["domains"])
app.include_router(items.router, prefix="/api/items", tags=["items"])
app.include_router(checkpoints.router, prefix="/api/items", tags=["checkpoints"])
app.include_router(snapshots.router, prefix="/api/items", tags=["snapshots"])
app.include_router(ai.router, prefix="/api/ai", tags=["ai"])
app.include_router(integrations.router, prefix="/api/integrations", tags=["integrations"])
app.include_router(reminders.router, prefix="/api", tags=["reminders"])


@app.get("/api/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
