"""Domain endpoints: list (with counts) and create."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth import get_current_user
from ..db import get_session
from ..models import User
from ..schemas import DomainCreate, DomainOut
from ..services.domains import ensure_domain, list_domains

router = APIRouter()


@router.get("", response_model=list[DomainOut])
async def get_domains(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[DomainOut]:
    rows = await list_domains(session, user.id)
    return [DomainOut(**row) for row in rows]


@router.post("", response_model=DomainOut, status_code=status.HTTP_201_CREATED)
async def create_domain(
    payload: DomainCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> DomainOut:
    domain = await ensure_domain(session, user.id, payload.name)
    await session.commit()
    return DomainOut(id=domain.id, name=domain.name, count=0)
