"""Web Push delivery: sign + POST a payload to a browser's push service.

Thin wrapper over ``pywebpush`` (VAPID signing + AES128GCM payload encryption).
``pywebpush`` is synchronous (it uses ``requests``), so each send runs in a
thread to avoid blocking the event loop. A 404/410 from the push service means
the subscription is gone for good — that row is deleted so dead devices prune
themselves. ``pywebpush`` is imported lazily (like ``crypto.py``) so the rest of
the app and tests that never push don't need it loaded.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..models import PushSubscription
from . import crypto

logger = logging.getLogger(__name__)


def endpoint_hash(endpoint: str) -> str:
    """Stable lookup/dedupe key for an (encrypted-at-rest) endpoint."""
    return hashlib.sha256(endpoint.encode()).hexdigest()


def _vapid_claims() -> dict[str, str]:
    return {"sub": settings.vapid_subject}


def _send_one(endpoint: str, p256dh: str, auth: str, payload: dict) -> None:
    """Blocking single send. Raises WebPushException on failure (caller maps the
    status code). Runs inside ``asyncio.to_thread``."""
    from pywebpush import webpush

    webpush(
        subscription_info={
            "endpoint": endpoint,
            "keys": {"p256dh": p256dh, "auth": auth},
        },
        data=json.dumps(payload),
        vapid_private_key=settings.vapid_private_key,
        vapid_claims=dict(_vapid_claims()),
        ttl=60 * 60 * 12,  # a day-ish; a reminder later than that is stale
    )


async def send_to_owner(
    session: AsyncSession, owner_id: uuid.UUID, payload: dict
) -> int:
    """Push ``payload`` to every live subscription for ``owner_id``.

    Returns the number of successful sends. Dead subscriptions (404/410) are
    deleted in the same session; other failures are logged and left in place
    (transient — the next reminder retries them). The caller commits.
    """
    rows = (
        (
            await session.execute(
                select(PushSubscription).where(PushSubscription.owner_id == owner_id)
            )
        )
        .scalars()
        .all()
    )
    if not rows:
        return 0

    # Import the exception type once; if pywebpush isn't installed, treat the
    # whole batch as unsendable rather than crashing the scheduler.
    try:
        from pywebpush import WebPushException
    except Exception:  # pragma: no cover - only when dependency missing
        logger.warning("pywebpush unavailable — cannot deliver push")
        return 0

    sent = 0
    dead: list[uuid.UUID] = []
    for sub in rows:
        try:
            endpoint = crypto.decrypt(sub.endpoint_enc)
        except Exception:  # pragma: no cover - corrupted row, drop it
            dead.append(sub.id)
            continue
        try:
            await asyncio.to_thread(
                _send_one, endpoint, sub.p256dh, sub.auth, payload
            )
            sub.last_used_at = datetime.now(timezone.utc)
            sent += 1
        except WebPushException as exc:
            status = getattr(getattr(exc, "response", None), "status_code", None)
            if status in (404, 410):
                dead.append(sub.id)
            else:
                sub.failed_at = datetime.now(timezone.utc)
                logger.warning("push send failed (status=%s): %s", status, exc)
        except Exception as exc:  # pragma: no cover - network/other
            sub.failed_at = datetime.now(timezone.utc)
            logger.warning("push send error: %s", exc)

    if dead:
        await session.execute(
            delete(PushSubscription).where(PushSubscription.id.in_(dead))
        )
    return sent
