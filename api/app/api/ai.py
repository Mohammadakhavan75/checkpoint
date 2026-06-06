"""AI router — stubbed (501) for now. Clean seam; do not implement until core works.

Planned (see FINAL_ARCHITECTURE.md §7):
- POST /api/ai/resume-summary/{item_id} -> SSE-streamed "here's where you were".
- POST /api/ai/compile-assist          -> suggest firstAction / subtasks.
The checkpoint schema is already an ideal LLM context payload.
"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status

router = APIRouter()


@router.post("/resume-summary/{item_id}")
async def resume_summary(item_id: uuid.UUID) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="AI resume-summary is not implemented yet",
    )


@router.post("/compile-assist")
async def compile_assist() -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="AI compile-assist is not implemented yet",
    )
