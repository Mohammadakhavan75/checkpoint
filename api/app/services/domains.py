"""Per-user domain registry helpers."""
from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..constants import RESERVOIR
from ..models import Domain, Item


async def list_domains(session: AsyncSession, owner_id: uuid.UUID) -> list[dict]:
    """Registered domains unioned with any domain that items reference, each with
    a live item count. Keeps a domain visible whether or not it has items yet."""
    regs = (
        (
            await session.execute(
                select(Domain)
                .where(Domain.owner_id == owner_id)
                .order_by(Domain.created_at)
            )
        )
        .scalars()
        .all()
    )
    item_domain_rows = (
        await session.execute(
            select(Item.domain)
            .where(Item.owner_id == owner_id, Item.domain != RESERVOIR)
            .distinct()
            .order_by(Item.domain)
        )
    ).all()
    count_rows = (
        await session.execute(
            select(Item.domain, func.count())
            .where(
                Item.owner_id == owner_id,
                Item.domain != RESERVOIR,
                Item.state != "done",
            )
            .group_by(Item.domain)
        )
    ).all()
    counts = {name: count for name, count in count_rows}

    id_by_name = {d.name: d.id for d in regs}
    ordered = [d.name for d in regs]
    seen = set(ordered)
    for (name,) in item_domain_rows:
        if name not in seen:
            ordered.append(name)
            seen.add(name)

    return [
        {"id": id_by_name.get(name), "name": name, "count": counts.get(name, 0)}
        for name in ordered
    ]


async def ensure_domain(
    session: AsyncSession, owner_id: uuid.UUID, name: str
) -> Domain:
    """Return the user's domain by name, creating it if it doesn't exist yet."""
    name = name.strip()
    existing = (
        await session.execute(
            select(Domain).where(Domain.owner_id == owner_id, Domain.name == name)
        )
    ).scalar_one_or_none()
    if existing is not None:
        return existing
    domain = Domain(owner_id=owner_id, name=name)
    session.add(domain)
    await session.flush()
    return domain
