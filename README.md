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
| Auth | OAuth2 password flow + JWT (bcrypt password hashing) |
| Packaging | Docker Compose (`postgres`, `api`, `web`) |

> Note: the spec calls for `passlib[bcrypt]`. Because passlib is unmaintained and breaks with
> current `bcrypt` on Python 3.14, we use the `bcrypt` library directly — same algorithm.

## Run the whole stack

```bash
cp .env.example .env          # adjust JWT_SECRET / DB_PASSWORD for anything real
docker compose up --build
```

- Web app: <http://localhost:5173>
- API + OpenAPI docs: <http://localhost:8000/docs>

The API container runs `alembic upgrade head` on start and (when `SEED_ON_START=true`) seeds the
example data from the prototype. Demo login: **`demo@checkpoint.app`** / **`checkpoint`**.

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
npm install
VITE_API_BASE=http://localhost:8000/api npm run dev
```

## Screens

1. **Today / Resume** — executable units only; each shows its first action + last checkpoint + Start.
2. **Ready to GO** — compiled units waiting to be pulled into Today.
3. **Domain backlog** — all states for a domain; containers expand to show phases.
4. **Reservoir (Brain Rots)** — parked ideas, promotable into domains.
5. **Session + Checkpoint** — timer/focus view; closing a session forces writing a checkpoint.

A global quick-capture input (the header bar) drops a thought into the Reservoir.

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
└── web/                     # React + TS + Vite SPA
```

## AI hooks

`/api/ai/*` is mounted but stubbed (`501`) — a clean seam for later resume-summary (SSE) and
compile-assist endpoints. The checkpoint schema is already an ideal LLM context payload.
