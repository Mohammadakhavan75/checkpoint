# Spec — Object Permanence: the agent checkpoint ledger (MCP v0)

| | |
|---|---|
| Status | Draft v1 |
| Owner | Mohammad |
| Date | 2026-07-12 |
| Size | small-medium (one migration, one router, one new top-level `mcp/` dir; **zero web changes**) |
| Reversibility | delete `mcp/`, unmount one router, `alembic downgrade -1` |
| Siblings | [LETTER_TO_FUTURE_YOU.md](./LETTER_TO_FUTURE_YOU.md) · [RETURN_CUE_NUDGE.md](./RETURN_CUE_NUDGE.md) · [COMPILED_BARRIER.md](./COMPILED_BARRIER.md) |

> **Audience note:** this spec is written to be implemented by a coding agent with no
> other context. Every decision is already made. Follow the steps in order. Where code
> is given, use it verbatim (adjusting only if the surrounding codebase has drifted).
> If something in the spec contradicts the actual code you find, prefer the actual
> code's conventions and note the deviation at the end.

---

## 1. Why this exists (read first)

Checkpoint's one job is: *resume meaningful work without rebuilding context from memory
after an interruption.* Until now "memory" meant the user's. This spec extends the same
job to a second kind of user: **an AI coding agent** (Claude Code and any MCP-capable
assistant).

Two observed failures motivated it:

1. **The dead run.** A multi-phase item was handed to an agent; the agent hit its
   usage limit mid-task and the session died. Everything it knew — which phases were
   done, what it decided, where it stopped — evaporated with the context window.
2. **The cold start.** Working one project across many separate chats (by design —
   one chat per feature) means every new session pays a re-explain tax: which threads
   are open, where each stopped, what was decided last time.

An LLM session is a brain that loses state *on schedule*. Checkpoint's core object —
the checkpoint receipt (`last_state · resume_from · next_action`) — is exactly the
right shape for it. So v0 gives agents four verbs against the existing data model:

- **orient** — "what's open, where did each thread stop?" (fixes the cold start)
- **get_item** — "give me this container, its phases, its receipts"
- **save_checkpoint** — "phase done / stopping here; here's the receipt" (fixes the dead run)
- **capture** — "park this stray thought in the Reservoir"

**Principles (identity-level, not polish):**

- **Receipts, not transcripts.** We never store chat logs. Only the compiled residue:
  state, decisions, next move.
- **The agent fills the Reservoir; only the human crosses the barrier.** No agent
  path can set `compiled`, promote items, or reorganize the backlog. State changes
  happen only through checkpoint outcomes — the same rule the human lives under
  ("a session is only closed once a valid checkpoint exists").
- **The ledger, never the runtime.** Checkpoint stores and serves work state. It does
  not dispatch, schedule, or monitor agents.
- **Zero new UI.** The app stays quiet. Everything ships server-side + one small
  MCP process.

---

## 2. Decisions already made (do not re-litigate)

| Question | Decision |
|---|---|
| Auth for agents | **Personal Access Token (PAT)**, bearer header. No OAuth in v0 (that's v1, when non-owner users or remote connectors arrive). |
| Where PATs are valid | **Only** on the new `/api/agent/*` routes. Session JWTs are **not** valid there; PATs are **not** valid anywhere else. Structural boundary, tested both ways. |
| PAT storage | SHA-256 hash only, in a new `personal_access_tokens` table. Raw token shown once at mint. |
| PAT management | CLI only (`python -m app.pat`), like `python -m app.seed`. No web UI in v0. |
| Endpoint surface | Exactly four: `GET /api/agent/orient`, `GET /api/agent/items/{id}`, `POST /api/agent/items/{id}/checkpoints`, `POST /api/agent/capture`. |
| Item state changes by agents | **Only via checkpoint `outcome`** (`active/deferred/blocked/done` — reuses `save_checkpoint` service, which also rolls up containers). No separate state endpoint. |
| `compiled` flag | No agent-reachable code path may read a request field into `compiled`, promote, compile, edit, or delete items. |
| MCP transport | Local **stdio** server in a new top-level `mcp/` directory (Python, official `mcp` SDK, FastMCP API), launched by Claude Code via `.mcp.json`. No HTTP/SSE transport in v0. |
| New settings | **None.** No `config.py` changes, no new env vars for the API. |
| Web changes | **None.** |
| Version bumps | **None in this change** — versioning happens at release time per the repo's release flow. |

---

## 3. Architecture at a glance

```
Claude Code (or any MCP client)
  │  tool call: orient / get_item / save_checkpoint / capture
  ▼
mcp/checkpoint_mcp.py            ← stdio process, launched from .mcp.json
  │  HTTPS/HTTP  Authorization: Bearer ckpt_pat_…   (from env CHECKPOINT_PAT)
  ▼
FastAPI  /api/agent/*  (new router, PAT-only auth)
  │  reuses existing services: items.capture, checkpoints.save_checkpoint, …
  ▼
Postgres (items, checkpoints, personal_access_tokens)
```

Identity resolution: the PAT row → `owner_id` → every query owner-scoped, exactly like
the JWT path. The agent never supplies or learns a username; it's baked into the token.

---

## 4. Implementation plan — follow in order

Before writing anything, read these files to load conventions:

- `api/app/models.py`, `api/app/auth.py`, `api/app/db.py`, `api/app/constants.py`
- `api/app/schemas.py`, `api/app/api/checkpoints.py`, `api/app/api/items.py`
- `api/app/services/items.py`, `api/app/services/checkpoints.py`
- `api/migrations/versions/0013_reminders.py` (migration template)
- `api/tests/conftest.py`, `api/tests/test_api.py` (test conventions)

Repo rules that apply: async SQLAlchemy everywhere; every query scoped by `owner_id`;
explicit Pydantic models, never raw dicts; checkpoints are append-only (never UPDATE
or DELETE a checkpoint row).

### Step 1 — Model: `PersonalAccessToken`

Append to `api/app/models.py` (after the `UserSettings` class):

```python
class PersonalAccessToken(Base):
    """A long-lived bearer credential for the agent API (`/api/agent/*`).

    Minted by the owner via CLI (`python -m app.pat`), shown once, stored as a
    SHA-256 hash. PATs deliberately bypass the interactive login (and 2FA), so
    they are valid ONLY on the agent router — never on the main API — and are
    revocable row-by-row. See docs/product/OBJECT_PERMANENCE_MCP.md.
    """

    __tablename__ = "personal_access_tokens"
    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_pats_token_hash"),
        Index("ix_pats_owner", "owner_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    # human label, e.g. "claude-code-macbook"
    name: Mapped[str] = mapped_column(Text, nullable=False)
    # sha256 hex of the full raw token; the raw token is never stored
    token_hash: Mapped[str] = mapped_column(Text, nullable=False)
    # first characters of the raw token (identification/revocation display only)
    token_prefix: Mapped[str] = mapped_column(Text, nullable=False)
    # reserved for v1 granular scopes; constant "agent" in v0
    scopes: Mapped[str] = mapped_column(
        Text, nullable=False, default="agent", server_default="agent"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
```

### Step 2 — Migration `0014_personal_access_tokens`

Create `api/migrations/versions/0014_personal_access_tokens.py`, mirroring the 0013
style exactly:

```python
"""personal_access_tokens: bearer credentials for the agent API (MCP v0)

One table. Reversible as a unit: `alembic downgrade -1` drops it and nothing
else depends on it. See docs/product/OBJECT_PERMANENCE_MCP.md.

Revision ID: 0014_personal_access_tokens
Revises: 0013_reminders
Create Date: 2026-07-12
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0014_personal_access_tokens"
down_revision: Union[str, None] = "0013_reminders"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "personal_access_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column(
            "owner_id",
            sa.Uuid(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("token_hash", sa.Text(), nullable=False),
        sa.Column("token_prefix", sa.Text(), nullable=False),
        sa.Column("scopes", sa.Text(), nullable=False, server_default="agent"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("token_hash", name="uq_pats_token_hash"),
    )
    op.create_index("ix_pats_owner", "personal_access_tokens", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_pats_owner", table_name="personal_access_tokens")
    op.drop_table("personal_access_tokens")
```

### Step 3 — Service: `api/app/services/pats.py`

New file:

```python
"""Personal access tokens: mint, authenticate, revoke (agent API auth).

The raw token is `ckpt_pat_` + 43 chars of urlsafe randomness, shown exactly
once at mint. Only its SHA-256 hex lands in the database, so a DB leak never
leaks usable credentials. Lookup is by hash (indexed, unique).
"""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models import PersonalAccessToken, User

TOKEN_PREFIX = "ckpt_pat_"
# prefix + 4 chars — enough to recognise a token in `list`, useless to guess.
_DISPLAY_LEN = len(TOKEN_PREFIX) + 4


def _hash(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _aware(dt: datetime | None) -> datetime | None:
    """SQLite returns naive datetimes even for timezone=True columns; normalise
    to UTC so comparisons never raise."""
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


async def create_pat(
    session: AsyncSession,
    owner_id: uuid.UUID,
    name: str,
    expires_days: int | None = 90,
) -> tuple[str, PersonalAccessToken]:
    """Mint a token. Returns (raw_token, row); the raw token is not recoverable."""
    raw = TOKEN_PREFIX + secrets.token_urlsafe(32)
    pat = PersonalAccessToken(
        owner_id=owner_id,
        name=name,
        token_hash=_hash(raw),
        token_prefix=raw[:_DISPLAY_LEN],
        expires_at=(
            datetime.now(timezone.utc) + timedelta(days=expires_days)
            if expires_days
            else None
        ),
    )
    session.add(pat)
    await session.flush()
    return raw, pat


async def authenticate_pat(session: AsyncSession, raw: str) -> User | None:
    """Resolve a raw bearer token to its owner, or None.

    None for: wrong prefix, unknown hash, revoked, expired. On success stamps
    ``last_used_at`` and commits (the app sessionmaker uses
    ``expire_on_commit=False``, so returned ORM objects stay usable).
    """
    if not raw or not raw.startswith(TOKEN_PREFIX):
        return None
    result = await session.execute(
        select(PersonalAccessToken).where(
            PersonalAccessToken.token_hash == _hash(raw)
        )
    )
    pat = result.scalar_one_or_none()
    if pat is None or pat.revoked_at is not None:
        return None
    now = datetime.now(timezone.utc)
    expires_at = _aware(pat.expires_at)
    if expires_at is not None and expires_at <= now:
        return None
    pat.last_used_at = now
    await session.commit()
    return await session.get(User, pat.owner_id)


async def list_pats(
    session: AsyncSession, owner_id: uuid.UUID
) -> list[PersonalAccessToken]:
    result = await session.execute(
        select(PersonalAccessToken)
        .where(PersonalAccessToken.owner_id == owner_id)
        .order_by(PersonalAccessToken.created_at.desc())
    )
    return list(result.scalars().all())


async def revoke_pat(
    session: AsyncSession, owner_id: uuid.UUID, token_prefix: str
) -> int:
    """Revoke every live token of this owner whose display prefix matches.
    Returns the number revoked."""
    result = await session.execute(
        select(PersonalAccessToken).where(
            PersonalAccessToken.owner_id == owner_id,
            PersonalAccessToken.token_prefix == token_prefix,
            PersonalAccessToken.revoked_at.is_(None),
        )
    )
    rows = list(result.scalars().all())
    now = datetime.now(timezone.utc)
    for row in rows:
        row.revoked_at = now
    await session.flush()
    return len(rows)
```

### Step 4 — CLI: `api/app/pat.py`

New file, following the `python -m app.seed` precedent:

```python
"""Mint / list / revoke personal access tokens for the agent API.

Run from api/ with the virtualenv active (needs DATABASE_URL, like alembic):

  python -m app.pat create --email you@example.com --name claude-code [--expires-days 90]
  python -m app.pat list   --email you@example.com
  python -m app.pat revoke --email you@example.com --prefix ckpt_pat_XXXX

The raw token prints exactly once. Store it in your shell env (CHECKPOINT_PAT),
never in git. See docs/product/OBJECT_PERMANENCE_MCP.md.
"""
from __future__ import annotations

import argparse
import asyncio
import sys

from sqlalchemy import select

from .db import SessionLocal
from .models import User
from .services.pats import create_pat, list_pats, revoke_pat


async def _get_user(session, email: str) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is None:
        print(f"no user with email {email!r}", file=sys.stderr)
        raise SystemExit(1)
    return user


async def _create(email: str, name: str, expires_days: int | None) -> None:
    async with SessionLocal() as session:
        user = await _get_user(session, email)
        raw, pat = await create_pat(session, user.id, name, expires_days)
        await session.commit()
        print("Personal access token (shown once, store it now):\n")
        print(f"  {raw}\n")
        print(f"name: {pat.name}  expires: {pat.expires_at or 'never'}")


async def _list(email: str) -> None:
    async with SessionLocal() as session:
        user = await _get_user(session, email)
        rows = await list_pats(session, user.id)
        if not rows:
            print("no tokens")
            return
        for p in rows:
            status = "revoked" if p.revoked_at else "live"
            print(
                f"{p.token_prefix}…  {p.name:<24} {status:<8} "
                f"created={p.created_at:%Y-%m-%d} "
                f"expires={p.expires_at:%Y-%m-%d}" if p.expires_at else
                f"{p.token_prefix}…  {p.name:<24} {status:<8} "
                f"created={p.created_at:%Y-%m-%d} expires=never"
            )


async def _revoke(email: str, prefix: str) -> None:
    async with SessionLocal() as session:
        user = await _get_user(session, email)
        n = await revoke_pat(session, user.id, prefix)
        await session.commit()
        print(f"revoked {n} token(s)")


def main() -> None:
    parser = argparse.ArgumentParser(prog="python -m app.pat")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_create = sub.add_parser("create")
    p_create.add_argument("--email", required=True)
    p_create.add_argument("--name", required=True)
    p_create.add_argument("--expires-days", type=int, default=90)

    p_list = sub.add_parser("list")
    p_list.add_argument("--email", required=True)

    p_revoke = sub.add_parser("revoke")
    p_revoke.add_argument("--email", required=True)
    p_revoke.add_argument("--prefix", required=True)

    args = parser.parse_args()
    if args.cmd == "create":
        asyncio.run(_create(args.email, args.name, args.expires_days or None))
    elif args.cmd == "list":
        asyncio.run(_list(args.email))
    elif args.cmd == "revoke":
        asyncio.run(_revoke(args.email, args.prefix))


if __name__ == "__main__":
    main()
```

(If the `_list` ternary formatting above fights you, simplify it — the requirement is
only: print prefix, name, live/revoked, created date, expiry-or-never per line.)

### Step 5 — Agent auth dependency: `api/app/agent_auth.py`

New file. **Do not modify `api/app/auth.py`** — the JWT path stays untouched.

```python
"""PAT bearer auth for the agent API (`/api/agent/*`) — and nowhere else.

A PAT deliberately bypasses the interactive login and 2FA, so the blast radius
is bounded structurally: this dependency is used only by the agent router, and
`get_current_user` (JWT) rejects PATs because they aren't JWTs. Both directions
are covered by tests (tests/test_agent.py).
"""
from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from .db import get_session
from .models import User
from .services.pats import authenticate_pat

_bearer = HTTPBearer(auto_error=False)


async def get_agent_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> User:
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing agent token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise exc
    user = await authenticate_pat(session, credentials.credentials)
    if user is None:
        raise exc
    return user
```

### Step 6 — Schemas

Append to `api/app/schemas.py` (a new `# ----- agent API (MCP v0) -----` section at
the end). Reuse `CheckpointOut` and `CheckpointCreate` — do not duplicate them.

```python
# ----- agent API (MCP v0) -----
class AgentPhaseOut(BaseModel):
    id: uuid.UUID
    title: str
    state: str
    compiled: bool
    first_action: str = ""
    latest_checkpoint: Optional[CheckpointOut] = None


class AgentItemSummary(BaseModel):
    id: uuid.UUID
    title: str
    domain: str
    state: str
    compiled: bool
    is_parent: bool = False
    phases_total: int = 0
    phases_done: int = 0
    latest_checkpoint: Optional[CheckpointOut] = None


class AgentOrientOut(BaseModel):
    user_name: str
    server_time: datetime
    protocol: str
    domains: list[str] = Field(default_factory=list)
    reservoir_count: int = 0
    items: list[AgentItemSummary] = Field(default_factory=list)


class AgentSnapshotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    title: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime


class AgentItemDetail(BaseModel):
    id: uuid.UUID
    title: str
    domain: str
    state: str
    mode: Optional[str] = None
    compiled: bool
    procedure: Optional[str] = None
    scope: Optional[str] = None
    description: str = ""
    first_action: str = ""
    deadline: Optional[datetime] = None
    start_at: Optional[datetime] = None
    end_at: Optional[datetime] = None
    phases: list[AgentPhaseOut] = Field(default_factory=list)
    checkpoints: list[CheckpointOut] = Field(default_factory=list)
    snapshots: list[AgentSnapshotOut] = Field(default_factory=list)


class AgentCaptureRequest(BaseModel):
    text: str = Field(min_length=1, max_length=500)
    # Optional existing domain name; omitted = Reservoir. The agent may not
    # invent domains — validated against the user's Domain registry.
    domain: Optional[str] = None


class AgentCaptureOut(BaseModel):
    id: uuid.UUID
    title: str
    domain: str
    state: str
```

### Step 7 — Router: `api/app/api/agent.py`

New file. Everything here depends on `get_agent_user` (PAT), never `get_current_user`.

```python
"""Agent API (MCP v0): orient / item detail / checkpoint / capture.

Four endpoints, PAT-auth only (agent_auth.get_agent_user). Design rules
(docs/product/OBJECT_PERMANENCE_MCP.md):
  * receipts, not transcripts — no chat logs are ever stored;
  * the agent fills the Reservoir; only the human crosses the compiled barrier
    (no compile/promote/edit/delete surface exists here);
  * item state moves only via checkpoint outcomes (save_checkpoint service),
    the same rule the human lives under.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..agent_auth import get_agent_user
from ..constants import CALENDAR, RESERVOIR
from ..db import get_session
from ..models import Domain, Item, Snapshot, User
from ..schemas import (
    AgentCaptureOut,
    AgentCaptureRequest,
    AgentItemDetail,
    AgentItemSummary,
    AgentOrientOut,
    AgentPhaseOut,
    AgentSnapshotOut,
    CheckpointCreate,
    CheckpointOut,
)
from ..services.checkpoints import (
    checkpoint_history,
    latest_checkpoints_for,
    save_checkpoint,
)
from ..services.items import capture, get_children, get_item

router = APIRouter()

# Returned by orient so every session re-reads the working agreement.
PROTOCOL = (
    "Checkpoint agent protocol: work one phase at a time. After finishing a "
    "phase, immediately save_checkpoint on that phase (outcome=done) with a "
    "concrete resume_from (file paths, commands, ids — never vague prose). "
    "When stopping or interrupted mid-work, save_checkpoint with outcome "
    "active/blocked/deferred and a next_action. Park stray ideas with "
    "capture. Never reorganize the backlog; compiling is the human's job."
)

_OPEN_STATES_EXCLUDED = ("done", "killed")


def _summary(
    item: Item,
    children: list[Item],
    latest: dict[uuid.UUID, object],
) -> AgentItemSummary:
    """Newest receipt across the item and its phases wins."""
    candidates = [latest.get(item.id)] + [latest.get(c.id) for c in children]
    candidates = [c for c in candidates if c is not None]
    newest = max(candidates, key=lambda c: c.created_at) if candidates else None
    return AgentItemSummary(
        id=item.id,
        title=item.title,
        domain=item.domain,
        state=item.state,
        compiled=item.compiled,
        is_parent=bool(children),
        phases_total=len(children),
        phases_done=sum(1 for c in children if c.state == "done"),
        latest_checkpoint=(
            CheckpointOut.model_validate(newest) if newest else None
        ),
    )


@router.get("/orient", response_model=AgentOrientOut)
async def orient(
    domain: str | None = None,
    limit: int = 10,
    user: User = Depends(get_agent_user),
    session: AsyncSession = Depends(get_session),
) -> AgentOrientOut:
    limit = max(1, min(limit, 25))

    stmt = select(Item).where(
        Item.owner_id == user.id,
        Item.parent_id.is_(None),
        Item.is_tutorial.is_(False),
        Item.deleted_at.is_(None),
        Item.source == "local",
        Item.state.notin_(_OPEN_STATES_EXCLUDED),
        Item.domain.notin_((RESERVOIR, CALENDAR)),
    )
    if domain:
        stmt = stmt.where(Item.domain == domain)
    items = list((await session.execute(stmt)).scalars().all())

    by_parent: dict[uuid.UUID, list[Item]] = {}
    if items:
        result = await session.execute(
            select(Item).where(
                Item.owner_id == user.id,
                Item.parent_id.in_([i.id for i in items]),
            )
        )
        for child in result.scalars().all():
            by_parent.setdefault(child.parent_id, []).append(child)

    all_ids = [i.id for i in items] + [
        c.id for kids in by_parent.values() for c in kids
    ]
    latest = await latest_checkpoints_for(session, all_ids)

    summaries = [_summary(i, by_parent.get(i.id, []), latest) for i in items]
    # Freshest thread first: newest receipt, else newest item update.
    lookup = {s.id: i for s, i in zip(summaries, items)}
    summaries.sort(
        key=lambda s: (
            s.latest_checkpoint.created_at
            if s.latest_checkpoint
            else lookup[s.id].updated_at
        ),
        reverse=True,
    )

    domains = [
        row[0]
        for row in (
            await session.execute(
                select(Domain.name)
                .where(Domain.owner_id == user.id)
                .order_by(Domain.name)
            )
        ).all()
    ]
    reservoir_count = (
        await session.execute(
            select(func.count())
            .select_from(Item)
            .where(
                Item.owner_id == user.id,
                Item.domain == RESERVOIR,
                Item.deleted_at.is_(None),
                Item.state.notin_(_OPEN_STATES_EXCLUDED),
            )
        )
    ).scalar_one()

    return AgentOrientOut(
        user_name=user.name or user.email,
        server_time=datetime.now(timezone.utc),
        protocol=PROTOCOL,
        domains=domains,
        reservoir_count=reservoir_count or 0,
        items=summaries[:limit],
    )


@router.get("/items/{item_id}", response_model=AgentItemDetail)
async def item_detail(
    item_id: uuid.UUID,
    user: User = Depends(get_agent_user),
    session: AsyncSession = Depends(get_session),
) -> AgentItemDetail:
    item = await get_item(session, item_id, user.id)
    if item is None or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Item not found")

    children = await get_children(session, item.id, user.id)
    latest = await latest_checkpoints_for(
        session, [item.id] + [c.id for c in children]
    )
    history = await checkpoint_history(session, item.id)
    snapshots = list(
        (
            await session.execute(
                select(Snapshot)
                .where(Snapshot.item_id == item.id)
                .order_by(Snapshot.created_at.desc())
                .limit(3)
            )
        )
        .scalars()
        .all()
    )

    fields = item.fields or {}
    return AgentItemDetail(
        id=item.id,
        title=item.title,
        domain=item.domain,
        state=item.state,
        mode=item.mode,
        compiled=item.compiled,
        procedure=item.procedure,
        scope=item.scope,
        description=fields.get("description", "") or "",
        first_action=fields.get("firstAction", "") or "",
        deadline=item.deadline,
        start_at=item.start_at,
        end_at=item.end_at,
        phases=[
            AgentPhaseOut(
                id=c.id,
                title=c.title,
                state=c.state,
                compiled=c.compiled,
                first_action=(c.fields or {}).get("firstAction", "") or "",
                latest_checkpoint=(
                    CheckpointOut.model_validate(latest[c.id])
                    if c.id in latest
                    else None
                ),
            )
            for c in children
        ],
        checkpoints=[CheckpointOut.model_validate(cp) for cp in history[:5]],
        snapshots=[AgentSnapshotOut.model_validate(s) for s in snapshots],
    )


@router.post(
    "/items/{item_id}/checkpoints",
    response_model=CheckpointOut,
    status_code=status.HTTP_201_CREATED,
)
async def agent_checkpoint(
    item_id: uuid.UUID,
    payload: CheckpointCreate,
    user: User = Depends(get_agent_user),
    session: AsyncSession = Depends(get_session),
) -> CheckpointOut:
    item = await get_item(session, item_id, user.id)
    if item is None or item.deleted_at is not None:
        raise HTTPException(status_code=404, detail="Item not found")
    checkpoint = await save_checkpoint(session, item, payload, user.id)
    await session.commit()
    await session.refresh(checkpoint)
    return CheckpointOut.model_validate(checkpoint)


@router.post(
    "/capture",
    response_model=AgentCaptureOut,
    status_code=status.HTTP_201_CREATED,
)
async def agent_capture(
    payload: AgentCaptureRequest,
    user: User = Depends(get_agent_user),
    session: AsyncSession = Depends(get_session),
) -> AgentCaptureOut:
    domain = (payload.domain or "").strip() or None
    if domain:
        known = [
            row[0]
            for row in (
                await session.execute(
                    select(Domain.name).where(Domain.owner_id == user.id)
                )
            ).all()
        ]
        if domain not in known:
            raise HTTPException(
                status_code=422,
                detail=(
                    f"Unknown domain {domain!r}. Use one of: "
                    f"{', '.join(sorted(known)) or '(none yet)'} — or omit "
                    "domain to capture into the reservoir."
                ),
            )
    item = await capture(session, user.id, payload.text, domain)
    await session.commit()
    return AgentCaptureOut(
        id=item.id, title=item.title, domain=item.domain, state=item.state
    )
```

Notes for the implementer:

- `save_checkpoint` already sets the item's state to the checkpoint `outcome`, clears
  `daily` on done, and rolls up a phase's parent container. Do not re-implement any of
  that.
- `CheckpointCreate` already enforces `resume_from` unless `outcome == "done"` — do
  not weaken or duplicate the validation.
- The agent checkpoint intentionally skips the `first_user_checkpoint` reveal logic in
  `api/app/api/checkpoints.py` (that's a web-UI moment). Accepted trade-off: an agent
  checkpoint counts as "a checkpoint exists" for the later web reveal. Fine.

### Step 8 — Mount the router

In `api/app/main.py`:

1. Extend the existing import line:
   `from .api import agent, ai, auth, checkpoints, domains, integrations, items, reminders, snapshots`
2. Add after the last `include_router` line:
   `app.include_router(agent.router, prefix="/api/agent", tags=["agent"])`

Nothing else in `main.py` changes.

### Step 9 — Tests: `api/tests/test_agent.py`

New file, using existing conventions (`auth_client` fixture exercises the real bearer
path — that is the right client for every test here; do **not** override
`get_current_user`). Add this local fixture at the top of the file:

```python
import pytest_asyncio

from app.services.pats import create_pat


@pytest_asyncio.fixture
async def pat(sessionmaker_, user):
    async with sessionmaker_() as s:
        raw, _ = await create_pat(s, user.id, "test-token", expires_days=90)
        await s.commit()
    return raw


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}
```

Required test cases (names given; implement each as an async test using `auth_client`,
`pat`, `sessionmaker_`, `user`; create items/checkpoints directly via a session where
setup data is needed):

| Test | Setup | Call | Assert |
|---|---|---|---|
| `test_orient_requires_token` | — | `GET /api/agent/orient` (no header) | 401 |
| `test_jwt_rejected_on_agent_route` | make a session JWT via `app.auth.create_access_token(str(user.id))` | `GET /api/agent/orient` with it | 401 |
| `test_pat_rejected_on_main_api` | — | `GET /api/items` with PAT bearer | 401 |
| `test_revoked_pat_rejected` | mint, then `revoke_pat` with its `token_prefix` | orient | 401 |
| `test_expired_pat_rejected` | mint with `expires_days=90`, then set the row's `expires_at` to yesterday | orient | 401 |
| `test_orient_shape_and_scoping` | user A: one local item w/ checkpoint; user B: one item | orient as A | 200; only A's item; `protocol` non-empty; `domains` list present |
| `test_orient_excludes_noise` | tutorial item, trashed item (`deleted_at` set), reservoir idea, `source="gcal"` item, done item | orient | none of them in `items`; `reservoir_count == 1` |
| `test_orient_freshest_first` | two items, checkpoint the older-created one more recently | orient | that item is `items[0]` |
| `test_item_detail_phases_and_receipts` | container + 2 phases, checkpoint on one phase | `GET /api/agent/items/{container_id}` | 200; 2 phases; phase's `latest_checkpoint` present; `first_action` populated from `fields["firstAction"]` |
| `test_item_detail_404_other_owner` | item owned by user B | get as A | 404 |
| `test_agent_checkpoint_moves_state_and_rolls_up` | container + 2 phases (states `active`) | checkpoint phase 1 `outcome=done`, then phase 2 `outcome=done` | 201s; phase states `done`; container state `done` after the second |
| `test_agent_checkpoint_validation` | leaf item | checkpoint `outcome=active` without `resume_from` | 422 |
| `test_agent_checkpoint_trashed_item_404` | item with `deleted_at` set | checkpoint it | 404 |
| `test_capture_defaults_to_reservoir` | — | `POST /api/agent/capture {"text": "stray thought"}` | 201; `domain == "reservoir"`; `state == "idea"` |
| `test_capture_into_known_domain` | Domain row "Research" for user | capture with `domain="Research"` | 201; `state == "needsdef"` |
| `test_capture_unknown_domain_422` | — | capture with `domain="madeup"` | 422; detail lists valid domains |
| `test_capture_never_compiled` | — | any capture, then load the Item row | `compiled is False` |
| `test_pat_last_used_stamped` | — | orient once, then read the PAT row | `last_used_at` is not None |

Run: `cd api && pytest tests/test_agent.py -q` (then the full `pytest -q` — everything
must stay green).

### Step 10 — MCP server: new top-level `mcp/` directory

**`mcp/requirements.txt`**

```
mcp>=1.2.0
httpx>=0.27.0
```

**`mcp/checkpoint_mcp.py`** — the whole server:

```python
"""Checkpoint MCP server (stdio) — the agent-side of the checkpoint ledger.

Bridges MCP tool calls to the Checkpoint agent API (/api/agent/*) using a
personal access token. Config via env (see .mcp.json.example at repo root):

  CHECKPOINT_API_BASE  e.g. http://localhost:8000/api   (default)
  CHECKPOINT_PAT       ckpt_pat_…  (mint: cd api && python -m app.pat create …)

Spec: docs/product/OBJECT_PERMANENCE_MCP.md
"""
from __future__ import annotations

import os
from typing import Any

import httpx
from mcp.server.fastmcp import FastMCP

API_BASE = os.environ.get(
    "CHECKPOINT_API_BASE", "http://localhost:8000/api"
).rstrip("/")
PAT = os.environ.get("CHECKPOINT_PAT", "")

mcp = FastMCP("checkpoint")


async def _call(method: str, path: str, **kwargs: Any) -> dict | list:
    """One HTTP round-trip. Errors come back as {'error': …} strings so the
    model can read and react to them instead of crashing the tool call."""
    if not PAT:
        return {
            "error": "CHECKPOINT_PAT is not set. Mint one: "
            "cd api && python -m app.pat create --email <you> --name <label>"
        }
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.request(
                method,
                f"{API_BASE}{path}",
                headers={"Authorization": f"Bearer {PAT}"},
                **kwargs,
            )
    except httpx.HTTPError as exc:
        return {"error": f"cannot reach the Checkpoint API at {API_BASE}: {exc}"}
    if response.status_code >= 400:
        try:
            detail = response.json().get("detail", response.text[:300])
        except Exception:
            detail = response.text[:300]
        return {"error": f"HTTP {response.status_code}: {detail}"}
    return response.json()


@mcp.tool()
async def orient(domain: str | None = None, limit: int = 10) -> dict | list:
    """Re-orient at the start of a work session: the user's open work threads,
    freshest first, each with its latest checkpoint receipt (where it stopped,
    what to do next). Call this BEFORE asking the user what they were doing —
    the answer is usually in here. Optionally filter to one domain.
    Also returns the working protocol; follow it."""
    params: dict[str, Any] = {"limit": limit}
    if domain:
        params["domain"] = domain
    return await _call("GET", "/agent/orient", params=params)


@mcp.tool()
async def get_item(item_id: str) -> dict | list:
    """Full detail for one work item by id (from orient): its phases and their
    states, the last 5 checkpoint receipts, and any snapshot notes. A container's
    phases are the work plan — execute them one at a time, in order."""
    return await _call("GET", f"/agent/items/{item_id}")


@mcp.tool()
async def save_checkpoint(
    item_id: str,
    outcome: str,
    last_state: str,
    resume_from: str = "",
    next_action: str = "",
    what_changed: str = "",
    problems: str = "",
    do_not_redo: str = "",
) -> dict | list:
    """Write the receipt that lets the NEXT session (human or agent) resume
    without re-deriving context. Call it (a) immediately after finishing each
    phase — outcome='done' — never batching several phases into one receipt,
    and (b) whenever work stops before it is finished — outcome='active' (will
    continue), 'blocked' (needs something), or 'deferred' (parked).

    item_id: the exact item/phase worked on (checkpoint the PHASE, not its
    container — the container rolls up automatically).
    outcome: one of active|deferred|blocked|done. Sets the item's state.
    last_state: one line — where things stand right now.
    resume_from: REQUIRED unless outcome='done'. Concrete re-entry point:
    file paths, function names, commands, ids. Never vague prose like
    "continue the feature".
    next_action: the single first move for the next session.
    what_changed / problems / do_not_redo: optional but valuable — decisions
    made, surprises hit, work that must not be repeated."""
    body: dict[str, Any] = {"outcome": outcome, "last_state": last_state}
    for key, value in (
        ("resume_from", resume_from),
        ("next_action", next_action),
        ("what_changed", what_changed),
        ("problems", problems),
        ("do_not_redo", do_not_redo),
    ):
        if value:
            body[key] = value
    return await _call("POST", f"/agent/items/{item_id}/checkpoints", json=body)


@mcp.tool()
async def capture(text: str, domain: str | None = None) -> dict | list:
    """Park a stray idea/task the user mentions mid-session so it isn't lost
    (max 500 chars). Without a domain it lands in the reservoir (parked ideas);
    with an existing domain name it lands there as an undefined task. Never
    invent domain names — omit the domain when unsure. Do NOT use this for
    work already being tracked; checkpoint that instead."""
    body: dict[str, Any] = {"text": text}
    if domain:
        body["domain"] = domain
    return await _call("POST", "/agent/capture", json=body)


if __name__ == "__main__":
    mcp.run()
```

**`mcp/README.md`**

```markdown
# Checkpoint MCP server (v0)

Local stdio bridge between MCP clients (Claude Code, Claude Desktop) and the
Checkpoint agent API. Spec + setup: docs/product/OBJECT_PERMANENCE_MCP.md.

    python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

### Step 11 — Client wiring at the repo root

**`.mcp.json.example`** (new file at repo root — the user copies it to `.mcp.json`,
which stays untracked):

```json
{
  "mcpServers": {
    "checkpoint": {
      "command": "mcp/.venv/bin/python",
      "args": ["mcp/checkpoint_mcp.py"],
      "env": {
        "CHECKPOINT_API_BASE": "http://localhost:8000/api",
        "CHECKPOINT_PAT": "${CHECKPOINT_PAT}"
      }
    }
  }
}
```

**`.gitignore`** — append (if not already present):

```
.mcp.json
mcp/.venv/
mcp/.env
```

**`CLAUDE.md`** (repo root; create if missing, else append the section):

```markdown
## Checkpoint agent ledger (MCP)

This repo IS the Checkpoint app, and it dogfoods its own agent ledger via the
`checkpoint` MCP server (tools: orient, get_item, save_checkpoint, capture).

- At the start of a session that continues tracked work, call `orient` first.
- Work one phase at a time. After each finished phase: `save_checkpoint` on
  that phase, outcome=done, with a concrete resume_from (paths/commands/ids).
- Stopping mid-work (or told to stop): `save_checkpoint` outcome=active/
  blocked/deferred with next_action before ending.
- Stray ideas the user mentions: `capture` (no domain unless certain).
- Never compile, promote, or reorganize items — that is the human's job.
```

### Step 12 — Documentation touch-ups

- README.md: under "AI hooks", add one sentence: agent access now exists via the
  local MCP server (`mcp/`) and PAT-authenticated `/api/agent/*` routes — see
  `docs/product/OBJECT_PERMANENCE_MCP.md`. Do not remove the existing `/api/ai/*`
  stub note (that seam is separate and stays stubbed).
- Do **not** bump any version numbers in this change.

---

## 5. Guardrails (P0 — these are requirements, not polish)

- [ ] **G1 — PAT boundary.** PATs authenticate `/api/agent/*` only. A PAT on any
      other route → 401. A session JWT (or mfa token) on `/api/agent/*` → 401.
- [ ] **G2 — No barrier crossing.** No agent endpoint reads `compiled`,
      `procedure`, `scope`, `daily`, `domain` (except validated capture target),
      or any compile/promote/edit/delete semantics from a request.
- [ ] **G3 — State only via receipts.** The only agent write that moves item state
      is a checkpoint outcome, through the existing `save_checkpoint` service.
- [ ] **G4 — Raw landings.** `capture` produces `reservoir/idea` or
      `<domain>/needsdef`, `compiled=False`, always.
- [ ] **G5 — Owner scoping.** Every query filters by the PAT owner's id; foreign
      `item_id`s → 404 (existing convention).
- [ ] **G6 — Receipts, not transcripts.** No endpoint accepts or stores
      conversation logs. Field size cap on capture (500 chars) enforced.
- [ ] **G7 — Secrets hygiene.** Raw PAT printed once by the CLI; only SHA-256 in
      the DB; never logged; `.mcp.json` untracked; example file uses env expansion.

## 6. Acceptance criteria (definition of done)

- [ ] `alembic upgrade head` and `alembic downgrade -1` both succeed.
- [ ] `python -m app.pat create/list/revoke` work against a dev DB.
- [ ] All tests in §Step 9 implemented and green; the full existing suite stays green.
- [ ] With the stack running (`docker compose up` or local uvicorn):
      `curl -H "Authorization: Bearer $CHECKPOINT_PAT" localhost:8000/api/agent/orient`
      returns the orient payload; the same curl against `/api/items` returns 401.
- [ ] `.mcp.json` wiring: in a fresh Claude Code session in this repo, the four
      tools are listed and `orient` returns real data.
- [ ] No changes under `web/`. No changes to `app/auth.py`, existing routers,
      or existing schemas beyond the appended agent section.

## 7. The kill test (manual runbook — the probe's success signal)

The feature exists to survive session death. Verify exactly that:

1. In the web app, compile a real container item with ≥3 phases.
2. Fresh Claude Code session: *"Work on <container title>. Follow the checkpoint
   protocol."* Confirm it calls `orient` → `get_item`, works phase 1, and
   checkpoints phase 1 with outcome=done before starting phase 2.
3. **Kill the session mid-phase-2** (close the terminal, no warning).
4. Open a brand-new session: *"Resume my Checkpoint work."*
5. **Pass** if the new session reaches productive work on phase 2 using only
   `orient`/`get_item` — no re-explaining, no re-deriving of finished phases
   (`do_not_redo`/`what_changed` respected). **Fail** if it asks the user to
   restate context or redoes phase 1.
6. Open the web app: the letter card / item history shows the agent's receipts —
   the human-facing loop (letter, nudge) now carries agent work too.

Run it ~3 times over two weeks of real use before deciding anything about v1.

## 8. How to revert

Remove `mcp/`, `.mcp.json.example`, the CLAUDE.md section; delete
`api/app/api/agent.py`, `api/app/agent_auth.py`, `api/app/services/pats.py`,
`api/app/pat.py`, `api/tests/test_agent.py`; drop the model class, the two lines in
`main.py`, and the schema section; `alembic downgrade -1`. Nothing else depends on
any of it.

## 9. Non-goals (v0) / parking lot

- **No OAuth 2.1 / remote (HTTP) MCP transport / claude.ai & ChatGPT web
  connectors / friends' access.** That is v1, only if the kill test earns it.
- **No web UI for PAT management** (settings surface candidate for v1).
- **No agent-side compile/promote/edit/delete/trash**, no reminder or calendar
  access, and no `/api/ai/*` implementation (that seam stays stubbed and separate).
- **No rate limiting** (single-user, local) — required before any multi-user v1.
- Parking lot: `orient` deep-link URLs into the web app; a `?resume={id}` handoff
  from the return nudge into a chat; per-token scopes (`read` vs `write`);
  Claude Code hook that auto-prompts a checkpoint on session end; letting the
  return nudge mention that the last receipt was agent-written ("your agent left
  you a running start").
