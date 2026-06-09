# Repository Map

This file is the stable high-level map of the repository.

Update it when major subsystems, ownership boundaries, architectural responsibilities, or build/test conventions change.

## Project purpose

Checkpoint is a local-first MVP for an ADHD-friendly personal continuity app. It helps a user return to one active mission through a minimal Start Ritual, leave a compact Stop Ritual checkpoint, and safely park lower-priority ideas for later.

## Main subsystems

| Subsystem | Responsibility | Main paths | Notes |
|---|---|---|---|
| Web | Authenticated React UI, Start Ritual, Stop Ritual, mission index, parking, settings | `web/src/`, `web/e2e/` | Vite + TypeScript; public app runs on port 5173. |
| API gateway | Public `/api` surface, cookie handling, service proxying, active-limit coordination | `services/api-gateway/` | FastAPI gateway runs on port 8000 and talks to internal services. |
| Identity service | Users, password auth, JWT issuance, Redis-backed refresh sessions, preferences | `services/identity-service/` | FastAPI service runs internally on port 8001. |
| Checkpoint service | Domains, missions, checkpoints, parking items, Today composition | `services/checkpoint-service/` | FastAPI service runs internally on port 8002. |
| Storage | Postgres data model and Redis refresh session state | `services/*/app/models.py`, `docker-compose.yml` | SQLAlchemy creates MVP tables on service startup. |
| Tests | Backend service tests, frontend component tests, browser E2E spec | `services/*/tests/`, `web/src/**/*.test.tsx`, `web/e2e/` | Playwright requires a local browser binary. |
| Docs | Architecture, ADRs, invariants | `docs/` | Stable human/AI memory. |
| AI memory | Context packs, task logs, change records | `ai/` | Required for AI-agent continuity. |

## Critical invariants

- Public API compatibility must be explicitly documented.
- Security-sensitive behavior must fail closed.
- Persistent data changes must include migration and rollback analysis.
- Concurrency-sensitive changes must document race/failure assumptions.

## Build commands

```bash
# run the local Docker stack
docker compose up --build

# backend tests
.venv/bin/python -m pytest services/identity-service/tests
.venv/bin/python -m pytest services/checkpoint-service/tests

# frontend tests and build
cd web && npm test -- --run
cd web && npm run build

# e2e, after installing Playwright browsers
cd web && npm run e2e
```

## Test strategy

- Identity service tests cover signup, login, preferences, refresh sessions, and cookie payload prerequisites.
- Checkpoint service tests cover active mission limits, checkpoint creation side effects, parking CRUD, and cross-user isolation.
- Frontend tests cover Start Ritual rendering, foldable rail persistence, settings updates, and Stop Ritual submission behavior.
- Playwright E2E covers signup, creating the first mission, leaving a checkpoint, and returning to Today.
- Docker health checks cover Postgres, Redis, internal services, gateway, and web.
- Playwright E2E is the only check that depends on an external browser binary download.

## Agent notes

Before changing code, the agent must create/update a task context pack and task plan.
