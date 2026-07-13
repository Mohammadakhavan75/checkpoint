# Checkpoint

**Checkpoint** is a single-user (shared with a few friends) **life-continuity tool**. Its one
job: let you **resume meaningful work without rebuilding context from memory** after an
interruption. The central object is the **checkpoint** — a receipt of where you stopped that
answers _"where was I, why did it matter, and what should I do next?"_

It is a real client–server migration of the single-file `brain_os.html` prototype: the
terminal/cockpit aesthetic and conceptual model are preserved; the in-memory data layer is
replaced with a Postgres-backed API.

See [docs/architecture/FINAL_ARCHITECTURE.md](docs/architecture/FINAL_ARCHITECTURE.md) for the
full build specification.

## Stack

| Layer | Choice |
|-------|--------|
| Backend | FastAPI (Python 3.11+, async) |
| ORM / migrations | SQLAlchemy 2.0 async + Alembic |
| Database | PostgreSQL 15 (asyncpg) |
| Frontend | React + TypeScript + Vite |
| Server state | TanStack Query |
| Markdown editor | Built-in Markdown editor with DOMPurify sanitization |
| Auth | OAuth2 password flow + JWT (bcrypt password hashing) |
| Packaging | Docker Compose (`postgres`, `api`, `web`) |

> Note: the spec calls for `passlib[bcrypt]`. Because passlib is unmaintained and breaks with
> current `bcrypt` on Python 3.14, we use the `bcrypt` library directly — same algorithm.

## Pinned versions

Exact versions in use across the project. Sourced from `web/package-lock.json`,
`api/requirements*.txt` (as resolved in the project virtualenv), and the image tags in the
Docker/Compose files. Keep this table in sync when any of those change.

### Container images

| Image | Tag | Defined in |
|-------|-----|------------|
| PostgreSQL | `postgres:15` | `docker-compose.yml` |
| Node (web build + dev server) | `node:22-alpine` | `web/Dockerfile` |
| Python (API runtime) | `python:3.11-slim` | `api/Dockerfile` |

### Backend — Python (`api/requirements.txt`)

Runtime container: **Python 3.11** (`python:3.11-slim`). Resolved runtime package versions:

| Package | Version | Role |
|---------|---------|------|
| fastapi | 0.136.3 | Web framework |
| starlette | 1.2.1 | ASGI toolkit (FastAPI dependency) |
| uvicorn[standard] | 0.49.0 | ASGI server |
| sqlalchemy[asyncio] | 2.0.50 | Async ORM |
| asyncpg | 0.31.0 | PostgreSQL driver |
| alembic | 1.18.4 | Database migrations |
| pydantic | 2.13.4 | Validation / schemas |
| pydantic-settings | 2.14.1 | Typed settings |
| bcrypt | 5.0.0 | Password hashing |
| PyJWT | 2.13.0 | JWT tokens |
| python-multipart | 0.0.32 | Form parsing |
| email-validator | 2.3.0 | Email validation |
| google-auth[requests] | 2.53.0 | Google sign-in verification |
| greenlet | 3.5.1 | SQLAlchemy async runtime (dependency) |

Dev / test only (`api/requirements-dev.txt`): **pytest 9.0.3** · **pytest-asyncio 1.4.0** ·
**httpx 0.28.1** · **aiosqlite 0.22.1**.

### Frontend — npm (`web/package-lock.json`)

Build + dev-server runtime: **Node 22** (`node:22-alpine`).

| Package | Version | Role |
|---------|---------|------|
| react | 18.3.1 | UI library |
| react-dom | 18.3.1 | React DOM renderer |
| @tanstack/react-query | 5.101.0 | Server-state management |
| marked | 18.0.5 | Markdown rendering (snapshot notes) |
| dompurify | 3.4.11 | HTML sanitization for rendered Markdown |
| vite | 8.0.16 | Build tool + dev server |
| typescript | 5.9.3 | Type system |
| @vitejs/plugin-react | 6.0.2 | Vite React plugin |
| esbuild | 0.28.1 | Explicit prerender build dependency |
| vitest | 4.1.9 | Frontend security regression tests |
| jsdom | 29.1.1 | DOM test environment |
| @types/node | 22.19.20 | Type definitions |
| @types/react | 18.3.31 | Type definitions |
| @types/react-dom | 18.3.7 | Type definitions |

### Markdown security boundary

Snapshot notes are edited directly in the React application. Markdown is converted with
`marked` and sanitized with `DOMPurify` before it reaches the DOM. The previous vendored
StackEdit application was removed in v0.15.0 because its opaque bundle contained a
known-vulnerable Handlebars runtime.

## Run the whole stack

```bash
cp .env.example .env
openssl rand -hex 24          # paste into DB_PASSWORD
openssl rand -hex 32          # paste into JWT_SECRET
docker compose up --build
```

- Web app: <http://localhost:5173>
- API + OpenAPI docs: <http://localhost:8000/docs>

The API container runs `alembic upgrade head` on start. Production startup refuses demo
seeding and rejects missing or weak JWT/database settings.

## Local development (without Docker)

**API** (needs a reachable Postgres; set `DATABASE_URL`):

```bash
cd api
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt
export DATABASE_URL=postgresql+asyncpg://checkpoint:checkpoint@localhost:5432/checkpoint
alembic upgrade head
python -m app.seed                      # optional demo data
uvicorn app.main:app --reload
pytest                                  # run the test suite (uses in-memory SQLite)
```

**Web**:

```bash
cd web
npm ci
VITE_API_BASE=http://localhost:8000/api npm run dev
```

## Backups

The database is the only source of truth. Two ops scripts give you a
disaster-recovery net — a `pg_dump` to a timestamped file plus an optional
upload to Google Drive (via rclone), and a guarded restore:

```bash
cp ops/backup.env.example ops/backup.env   # configure once
./ops/backup-checkpoint.sh                  # dump + upload (run nightly via cron)
./ops/restore-checkpoint.sh --list          # see local + Drive dumps
./ops/restore-checkpoint.sh --latest        # restore (overwrites the live DB)
```

Full setup — Google service account, rclone remote, cron line, and fresh-machine
recovery — is in [docs/ops/BACKUP_RESTORE.md](docs/ops/BACKUP_RESTORE.md).

## Screens

1. **Today / Resume** — executable units only; each shows its first action + last checkpoint + Start.
2. **Ready to GO** — compiled units waiting to be pulled into Today.
3. **Domain backlog** — all states for a domain; containers expand to show phases.
4. **Reservoir (Brain Rots)** — parked ideas, promotable into domains.
5. **Session + Checkpoint** — timer/focus view; closing a session forces writing a checkpoint.

A global quick-capture input (the header bar) drops a thought into the Reservoir by
default. Its target selector also offers **Fast Task Domain**: pick a domain and the
captured item skips the Reservoir, landing straight in that domain as `needsdef` (the
same end state as promoting a brain rot, in one step).

## The core model

- **Items** are block-tree-shaped: an item can contain child items (a *container* with *phases*).
- **Compile** turns a vague item into a resumable unit via the procedure×scope matrix
  (`known|unbounded` becomes a phased container; everything else gets a single first action).
- **Checkpoints** are append-only history. A work session is only "closed" once a valid
  checkpoint (last_state · next_action · resume_from) exists.
- Every query is scoped to the authenticated user's `owner_id`.

## Project layout

```
checkpoint/
├── docker-compose.yml
├── .env.example
├── brain_os.html            # the original prototype (reference)
├── api/                     # FastAPI app, services, Alembic migrations, tests
├── ops/                     # deploy + backup/restore scripts
└── web/                     # React + TS + Vite SPA
```

## AI hooks

`/api/ai/*` is mounted but stubbed (`501`) — a clean seam for later resume-summary (SSE) and
compile-assist endpoints. The checkpoint schema is already an ideal LLM context payload.

Agent access now exists via the local MCP server (`mcp/`) and PAT-authenticated `/api/agent/*`
routes — see [docs/product/OBJECT_PERMANENCE_MCP.md](docs/product/OBJECT_PERMANENCE_MCP.md).
