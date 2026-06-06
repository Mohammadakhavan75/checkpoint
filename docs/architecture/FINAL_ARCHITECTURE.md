# Checkpoint — Architecture & Build Specification

> A build spec for an AI coding agent (Claude Code). Implement the app described below.
> Follow the decisions exactly; they were chosen deliberately. Where this doc says
> "do not build," do not build it, even if it seems helpful.

---

## 1. What this app is

**Checkpoint** is a single-user (shared with a few friends) **life-continuity tool**. It is
not a task manager, note app, calendar, or project tracker. Its one job: let a person
**resume meaningful work without rebuilding context from memory** after an interruption.

The central object is the **checkpoint** (a "receipt" of where you stopped). Everything
else exists to support writing and reading checkpoints.

The product answers one recurring question:

> "Where was I, why did it matter, and what should I do next?"

There is an existing single-file HTML prototype (`brain_os.html`) with a terminal/cockpit
aesthetic and working in-browser logic. This project **migrates that prototype** to a real
client–server architecture. Preserve the visual style and the conceptual model; replace the
in-memory data layer with a Postgres-backed API.

---

## 2. Tech stack (fixed decisions)

| Layer        | Choice                                              | Why |
|--------------|-----------------------------------------------------|-----|
| Backend      | **FastAPI** (Python 3.11+), async                   | Native async for future streaming AI; Pydantic validation; auto OpenAPI docs; Python AI ecosystem. |
| ORM          | **SQLAlchemy 2.0 (async)**                          | Proven, typed, async-capable. |
| Migrations   | **Alembic**                                         | Versioned, repeatable schema changes. |
| Database     | **PostgreSQL 15+**                                  | Relational truth for the block-tree data model; integrity for parent/child rollups. |
| Driver       | **asyncpg** (via SQLAlchemy async engine)           | Async Postgres driver. |
| Frontend     | **React + TypeScript + Vite**                       | Largest ecosystem, best tooling/AI-assist support for a solo maintainer. |
| Server state | **TanStack Query (React Query)**                    | Caching, dedupe, loading/refetch handling for REST. |
| Auth         | **OAuth2 password flow + JWT** (`passlib[bcrypt]`)  | Dependency-light, maintainable at friends-scale. |
| Packaging    | **Docker Compose** (`postgres`, `api`, `web`)       | `docker compose up` to run the whole stack. |

**Do not** introduce: CRDTs, websockets/real-time, offline sync, GraphQL, a second database,
Redis, Celery, or a message queue. None are needed for a single-user-shared-with-friends tool.
They are explicitly out of scope and would violate the project's "stay minimal" principle.

---

## 3. Data model

The data is **block-tree-shaped**: items can contain child items (a "container" with "phases").
The tree is a self-referential foreign key. Queryable fields are real typed columns; loose
mode-specific prose lives in a single `jsonb` column so adding fields needs no migration.

### Tables

```sql
-- users
users(
  id              uuid primary key default gen_random_uuid(),
  email           text unique not null,
  hashed_password text not null,
  created_at      timestamptz not null default now()
)

-- items (tasks, containers, phases — all the same table)
items(
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references users(id) on delete cascade,
  parent_id   uuid references items(id) on delete cascade,   -- null = top-level
  title       text not null,
  domain      text not null,                  -- e.g. 'DDWS','HPC','Research','reservoir'
  state       text not null,                  -- see STATES enum below
  mode        text,                           -- 'Do'|'Scout'|'Plan'|'Deep' (nullable)
  daily       boolean not null default false, -- on the Today list
  compiled    boolean not null default false, -- has been turned into a resumable unit
  procedure   text,                           -- 'known'|'unknown'  (the matrix axis)
  scope       text,                           -- 'bounded'|'unbounded' (the matrix axis)
  fields      jsonb not null default '{}',    -- firstAction, description, risk, resumeFrom,
                                              -- whyNow, output, minWin, stopRule, checkpointRule, etc.
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
)

-- checkpoints (APPEND-ONLY history — this is the resume loop)
checkpoints(
  id           uuid primary key default gen_random_uuid(),
  item_id      uuid not null references items(id) on delete cascade,
  outcome      text not null,                 -- 'active'|'deferred'|'blocked'|'done'
  last_state   text not null,
  what_changed text,
  problems     text,
  next_action  text not null,
  resume_from  text not null,
  do_not_redo  text,
  created_at   timestamptz not null default now()
)
```

### Indexes
```sql
create index ix_items_owner       on items(owner_id);
create index ix_items_parent      on items(parent_id);
create index ix_items_owner_daily on items(owner_id, daily);
create index ix_items_owner_domain on items(owner_id, domain);
create index ix_checkpoints_item  on checkpoints(item_id, created_at desc);
```

### Important model rules
- **`checkpoints` is append-only.** Never UPDATE or DELETE a checkpoint. The "current receipt"
  of an item is simply its most recent checkpoint row. Checkpoint *history* is a product feature.
- The **`fields` jsonb** holds all free-text / mode-varying prose. Do not add columns for these.
  Known keys: `firstAction`, `description`, `risk`, `resumeFrom`, `whyNow`, `output`, `minWin`,
  `stopRule`, `checkpointRule`.
- Every query is scoped by `owner_id` of the authenticated user. This is the entire multi-user
  isolation mechanism — there is no team/sharing model.

### State values (`state`)
`idea` · `needsdef` (important-but-undefined) · `active` · `scout` · `blocked` · `waiting` ·
`deferred` · `done` · `killed`

### The compile matrix (`procedure` × `scope`)
- `known | bounded` → Easy execution: just do it.
- `unknown | bounded` → Research spike: scout, map, define.
- `known | unbounded` → Time trap: must be broken into subtasks (becomes a container).
- `unknown | unbounded` → Paralysis trap: to be defined.

---

## 4. Core domain logic (port from `brain_os.html`)

This logic currently lives in the browser prototype and **must move into the API as service
functions** (integrity rules belong next to the database, not in the client). Reference the
prototype for exact behavior:

- **`kids(id)`** — children of an item (`parent_id == id`).
- **`isParent(item)`** — true if it has any children.
- **`rollup(parent_id)`** — recompute a container's `state` from its phases:
  - all children `done` → parent `done`
  - all children `done` or `killed` → parent `deferred`
  - any child `active`/`scout` → parent `active`
  Call after any child state change.
- **`setState(id, state)`** — set state; if it's a container being set to `killed`/`done`/`deferred`,
  cascade to all children; then `rollup` its own parent if any.
- **`compile(item)`** — turn an item into a resumable unit. If `known|unbounded` (time trap) or
  it already has children, it becomes a pure container (not directly executable: `compiled=true`,
  `daily=false`, no `firstAction`); reconcile its phase children. Otherwise mark `compiled=true`
  and move `idea`/`needsdef` → `active` (or `scout` if mode is Scout).
- **`saveCheckpoint(item_id, payload)`** — validate required fields (`last_state`, `next_action`,
  `resume_from` are mandatory), INSERT a new `checkpoints` row, set the item's `state` to the
  checkpoint `outcome`, set `daily=false` if outcome is `done`, then `rollup` the parent.
- **`capture(text)`** — create a new item in domain `reservoir`, state `idea`.
- **`promote(id, domain)`** — move a reservoir idea into a real domain, state `needsdef`.

A checkpoint cannot be skipped: a work session is only "closed" when a valid checkpoint exists.

---

## 5. REST API

Base path `/api`. All endpoints (except auth) require a valid JWT and are scoped to the user.
FastAPI auto-generates OpenAPI docs at `/docs`.

### Auth
```
POST /api/auth/register      {email, password}            -> {id, email}
POST /api/auth/login         {email, password}            -> {access_token, token_type}
GET  /api/auth/me                                          -> current user
```

### Items
```
GET    /api/items?tab=today|ready|reservoir&domain=...     -> filtered list (see view filters)
GET    /api/items/{id}                                     -> item + children + latest checkpoint
POST   /api/items            {title, domain, ...}          -> created item
PATCH  /api/items/{id}       {partial fields}              -> updated item
DELETE /api/items/{id}                                     -> (soft: set state='killed')
POST   /api/items/capture    {text}                        -> quick-capture into reservoir
POST   /api/items/{id}/promote {domain}                    -> reservoir -> domain
POST   /api/items/{id}/compile {fields...}                 -> run compile logic
POST   /api/items/{id}/state {state}                       -> setState + rollup/cascade
POST   /api/items/{id}/daily {daily: bool}                 -> add/remove from Today
```

### Checkpoints
```
GET  /api/items/{id}/checkpoints                           -> full history (newest first)
POST /api/items/{id}/checkpoints {outcome, last_state, next_action, resume_from, ...}
                                                           -> append checkpoint + saveCheckpoint logic
```

### View filters (server-side, mirror the prototype)
- **today**: `daily=true AND not a parent AND state != 'killed'`
- **ready**: `compiled=true AND daily=false AND not a parent AND state not in ('killed','done')`
- **reservoir**: `domain='reservoir' AND state != 'killed'`
- **domain**: `domain=X AND parent_id IS NULL` (phases render nested under their container)

All Pydantic request/response schemas should be explicit models, not raw dicts.

---

## 6. Frontend

- **React + TypeScript + Vite** SPA. **TanStack Query** for all server interaction (one query
  hook per endpoint; mutations invalidate the relevant queries).
- **Preserve the prototype's terminal/cockpit aesthetic**: dark ink background, JetBrains Mono +
  IBM Plex Sans, amber/cyan/green accent system, the scanline texture, state-color markers.
  Port the CSS from `brain_os.html` into component styles (CSS modules or a single global sheet).
- **Screens** (from the prototype + the product plan):
  1. **Today / Resume** — executable units only; each shows first action + last checkpoint + Start.
  2. **Ready to GO** — compiled units waiting to be pulled into Today.
  3. **Domain backlog** — all states for a domain; containers expand to show phases.
  4. **Reservoir ("Brain Rots")** — parked ideas, promotable into domains.
  5. **Session + Checkpoint** — timer/focus view; closing a session forces writing a checkpoint.
- A global **quick-capture** input (the header bar) that POSTs to `/api/items/capture`.
- Emotional tone: grounding, forgiving, non-judgmental. No streaks, no guilt, no "you're behind."

---

## 7. AI hooks (DESIGN FOR, do not build yet)

Leave a clean seam; do not implement until the core app works.
- Add an `app/api/ai.py` router, mounted but with stub endpoints returning `501` for now.
- Planned endpoints (later):
  - `POST /api/ai/resume-summary/{item_id}` — read item + checkpoint history, stream an LLM-written
    "here's where you were" summary via **Server-Sent Events** (this is why the backend is async).
  - `POST /api/ai/compile-assist` — suggest firstAction / subtasks for a vague item.
- The checkpoint schema (`last_state`, `next_action`, `resume_from`, `do_not_redo`) is already an
  ideal LLM context payload — pass it through directly.
- For future semantic search across checkpoints, use the **pgvector** Postgres extension (store
  embeddings in the same DB — no new infrastructure). Do not add this now.

---

## 8. Repository layout

```
checkpoint/
├── docker-compose.yml
├── .env.example                 # DATABASE_URL, JWT_SECRET, etc.
├── README.md
├── api/
│   ├── Dockerfile
│   ├── pyproject.toml           # or requirements.txt
│   ├── alembic.ini
│   ├── migrations/              # Alembic
│   └── app/
│       ├── main.py              # FastAPI app, router mounting, CORS
│       ├── config.py            # pydantic-settings, env vars
│       ├── db.py                # async engine, session dependency
│       ├── models.py            # SQLAlchemy models (User, Item, Checkpoint)
│       ├── schemas.py           # Pydantic request/response models
│       ├── auth.py              # JWT, password hashing, current-user dependency
│       ├── services/
│       │   ├── items.py         # rollup, setState, compile, capture, promote
│       │   └── checkpoints.py   # saveCheckpoint logic
│       └── api/
│           ├── auth.py
│           ├── items.py
│           ├── checkpoints.py
│           └── ai.py            # stubbed (501) for now
└── web/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx
        ├── api/                 # typed fetch client + TanStack Query hooks
        ├── components/          # Row, Chip, StateMarker, SessionTimer, CheckpointForm, ...
        ├── views/               # Today, Ready, Domain, Reservoir, Session
        ├── styles/              # ported terminal aesthetic
        └── types.ts             # shared TS types mirroring API schemas
```

---

## 9. docker-compose (target shape)

Three services. The frontend talks to the API over a configurable base URL; the API talks to
Postgres. Postgres data persists in a named volume.

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: checkpoint
      POSTGRES_USER: checkpoint
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes: [pgdata:/var/lib/postgresql/data]
  api:
    build: ./api
    environment:
      DATABASE_URL: postgresql+asyncpg://checkpoint:${DB_PASSWORD}@postgres/checkpoint
      JWT_SECRET: ${JWT_SECRET}
    depends_on: [postgres]
    ports: ["8000:8000"]
    # entrypoint runs `alembic upgrade head` then launches uvicorn
  web:
    build: ./web
    environment:
      VITE_API_BASE: http://localhost:8000/api
    ports: ["5173:5173"]
volumes:
  pgdata:
```

---

## 10. Build sequence (do in this order)

1. **Schema first.** SQLAlchemy models + initial Alembic migration. Get the tables right;
   everything depends on this.
2. **CRUD, no auth.** FastAPI endpoints for items + checkpoints against the DB. Verify with `/docs`.
3. **Port domain logic** into `services/` — rollup, setState/cascade, compile, saveCheckpoint,
   capture, promote. Unit-test the rollup and compile rules.
4. **Frontend shell.** Vite + React + TanStack Query; rebuild the five views against the API;
   port the terminal aesthetic from `brain_os.html`.
5. **Auth.** JWT login/register, `owner_id` scoping on every query. Now it's shareable.
6. **Dockerize + deploy.** `docker compose up`; deploy to a VPS; hand friends a URL.
7. **Later:** implement the `/api/ai` router (was stubbed in step 2).

Seed the dev database with the example data from `brain_os.html` (the DDWS / HPC / Research
domains, the vLLM checkpointed example, the Slurm container with phases) so screens have content.

---

## 11. Acceptance criteria

- A user can register, log in, and only ever see their own items.
- Quick-capture drops an idea into the Reservoir; promoting it moves it to a domain as `needsdef`.
- Compiling a `known|unbounded` item produces a container; its phases roll the container's state up.
- A user can pull a compiled unit into Today, start a session, and **cannot close it without
  writing a checkpoint** with last_state / next_action / resume_from.
- Reopening an item shows its latest checkpoint and full checkpoint history.
- `docker compose up` brings up the whole stack; Alembic migrations run automatically.
- The UI keeps the prototype's terminal/cockpit look and its non-judgmental tone (no streaks/guilt).

---

## 12. Non-goals (do not build)

Calendar · notifications · habit tracking · streaks · gamification points · team/collaboration ·
sharing permissions · real-time/websockets · offline sync · CRDTs · mobile app · analytics
dashboards · rich-text editor · recurring tasks. The product earns new features only after the
checkpoint→resume loop is proven to work.
