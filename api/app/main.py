"""FastAPI application: router mounting, CORS, optional seed-on-start."""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import ai, auth, checkpoints, domains, items, snapshots
from .config import settings


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if settings.seed_on_start:
        from .seed import seed

        await seed()
    yield


app = FastAPI(title="Checkpoint API", version="0.1.0", lifespan=lifespan)

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


@app.get("/api/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
