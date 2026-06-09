# Implementation Plan: Checkpoint Full-Stack MVP

## Task ID

`TASK-0001`

## Problem

Checkpoint needs a local Docker-first full-stack MVP for a minimalist ADHD-friendly continuity workflow. The app should avoid dashboards and open directly to a guided Start Ritual for one primary mission.

## Constraints

- Compatibility: Public API is `/api`; no prior production clients exist, but frontend and tests must match the documented contract.
- Security: Use server-side auth checks, HttpOnly cookies, password hashes, and user-scoped data access.
- Performance: Local MVP; keep API calls bounded with explicit HTTPX timeouts.
- Migration: Initial schema only; no production migration history yet.
- Operational: Docker Compose must expose web and gateway while keeping services internal.

## Files likely to inspect

- `AGENTS.md`
- `ai/context/repo-map.md`
- `ai/context/subsystem-*.md`
- `docs/invariants/*.md`
- `services/*/app/*.py`
- `web/src/**/*.tsx`
- `web/src/**/*.ts`

## Files likely to change

- `docker-compose.yml`
- `.env.example`
- `.gitignore`
- `README.md`
- `services/api-gateway/**`
- `services/identity-service/**`
- `services/checkpoint-service/**`
- `web/**`
- `ai/context-packs/TASK-0001-checkpoint-mvp.md`
- `ai/changes/AI-2026-05-10-*.md`
- `ai/changes/AI-2026-05-10-*.yaml`

## Tests likely to update

- `services/identity-service/tests/test_identity.py`
- `services/checkpoint-service/tests/test_checkpoint.py`
- `web/src/pages/TodayPage.test.tsx`
- `web/src/components/AppShell.test.tsx`
- `web/e2e/checkpoint.spec.ts`

## Proposed sequence

1. Inspect repository map, subsystem summaries, and invariants.
2. Create the task context pack and task plan.
3. Scaffold Docker Compose, service Dockerfiles, and environment defaults.
4. Implement identity service auth and preference behavior with tests.
5. Implement checkpoint service domain behavior with tests.
6. Implement API gateway routes, cookies, and service proxying.
7. Implement React app routes, sparse UI, foldable rail, and Stop Ritual.
8. Add frontend component tests and E2E spec.
9. Run unit tests, build, Docker health checks, and browser QA.
10. Update change records, context summaries, and README.
11. Commit implementation slices separately.

## Stop conditions

Stop and request human review if:

- public API compatibility changes unexpectedly;
- storage schema/data migration is required beyond initial MVP tables;
- security invariant conflict appears;
- implementation requires broad refactor;
- verification cannot be run;
- behavior is ambiguous or underspecified.

## Verification commands

```bash
docker compose up --build -d
docker compose ps
.venv/bin/python -m pytest services/identity-service/tests
.venv/bin/python -m pytest services/checkpoint-service/tests
cd web && npm run build
cd web && npm test -- --run
cd web && npm run e2e
```

## Verification result

- Docker Compose stack: passed, all services healthy.
- Identity tests: passed.
- Checkpoint tests: passed.
- Frontend build: passed.
- Frontend unit tests: passed.
- Browser QA: passed on desktop and mobile with no console errors.
- Playwright E2E: spec added, but local run is blocked until Chromium can be downloaded; `npx playwright install chromium` timed out against the Playwright CDN.
