"""First-run tutorial seeding.

Every new account gets one tutorial item that *already has a checkpoint*, so
the first screen the user ever sees is the resume card pointed at seeded
content — they experience a resume before meeting any vocabulary. Resuming it
opens a session whose only content is one question ("What were you working on
before you opened this?"), which hands off to their real work.
"""
from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Checkpoint, Item

# Not registered in the domains table and excluded from the sidebar domain
# list (see services.domains) — the tutorial bypasses the ontology.
TUTORIAL_DOMAIN = "welcome"

TUTORIAL_TITLE = "Pick up where you left off"


async def seed_tutorial(session: AsyncSession, owner_id: uuid.UUID) -> Item:
    """Create the seeded tutorial item + its checkpoint for a new account."""
    item = Item(
        owner_id=owner_id,
        title=TUTORIAL_TITLE,
        domain=TUTORIAL_DOMAIN,
        state="active",
        mode="Do",
        daily=True,
        compiled=True,
        procedure="known",
        scope="bounded",
        is_tutorial=True,
        fields={
            "description": "Every session here ends with a receipt like this card. "
            "Every return starts from one — nothing to reconstruct.",
            "firstAction": "press ⟲ RESUME",
        },
    )
    session.add(item)
    await session.flush()
    session.add(
        Checkpoint(
            item_id=item.id,
            outcome="active",
            last_state="You created an account. That's it — that's the whole state.",
            next_action="press ⟲ RESUME",
            resume_from="right here — this card is how every return to Checkpoint begins",
            do_not_redo="signing up",
        )
    )
    await session.flush()
    return item
