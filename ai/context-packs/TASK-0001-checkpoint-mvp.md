# Context Pack: Checkpoint Full-Stack MVP

## Task ID

`TASK-0001`

## Goal

Build a Dockerized full-stack MVP for Checkpoint, an ADHD-friendly personal continuity app that opens to a guided Start Ritual and stores the user's mission/checkpoint state.

## User-visible behavior

- Users can sign up, log in, and log out.
- Authenticated users land on `/today`.
- Today shows one primary mission, last checkpoint, next physical action, do-not-rethink note, and sparse actions.
- Users can leave a Stop Ritual checkpoint and return to Today with the checkpoint reflected.
- Users can fold the side rail; the preference is stored per user.
- Users can configure active mission limit in settings.
- Users can create, activate, park, and browse missions and parking items.

## Relevant subsystems

- Web
- API gateway
- Identity service
- Checkpoint domain service
- Storage
- AI memory and docs

## Relevant files

- `docker-compose.yml`
- `README.md`
- `services/api-gateway/`
- `services/identity-service/`
- `services/checkpoint-service/`
- `web/`
- `ai/context/*.md`
- `docs/invariants/*.md`

## Relevant symbols

- `AppShell`
- `TodayPage`
- `StopCheckpointPage`
- `AuthProvider`
- `user_id_from_request`
- `set_auth_cookies`
- `signup`
- `login`
- `refresh`
- `get_today`
- `create_mission`
- `activate_mission`
- `create_checkpoint`

## Relevant tests

- `services/identity-service/tests/test_identity.py`
- `services/checkpoint-service/tests/test_checkpoint.py`
- `web/src/pages/TodayPage.test.tsx`
- `web/src/components/AppShell.test.tsx`
- `web/e2e/checkpoint.spec.ts`

## Relevant docs

- `ai/context/repo-map.md`
- `ai/context/subsystem-web.md`
- `ai/context/subsystem-api-gateway.md`
- `ai/context/subsystem-identity.md`
- `ai/context/subsystem-checkpoint.md`
- `docs/invariants/api-compatibility.md`
- `docs/invariants/security.md`
- `docs/invariants/storage.md`
- `docs/invariants/concurrency.md`

## Relevant invariants

- API compatibility: public `/api` contract must remain stable unless documented.
- Security: authentication and authorization fail closed; no secrets committed or logged.
- Storage: durable writes should fail safely; schema impact and rollback are documented.
- Concurrency: active mission limit is race-sensitive and acceptable only for local MVP assumptions.

## Related ADRs

- None. The MVP introduces the initial architecture and no breaking migration from an existing production system.

## Previous change records

- None.

## Current understanding

The repository began as an empty initial branch plus AI governance scaffolding. The task is to preserve that governance model while adding the Checkpoint MVP in small, reviewable implementation slices.

## Assumptions

- MVP is local Docker-first and not cloud deployed.
- SQLAlchemy metadata table creation is acceptable for the first MVP; production migrations are future work.
- Email verification, password reset, social login, collaboration, notifications, analytics, and AI chat are out of scope.
- Timestamps are stored in UTC and displayed by the browser when surfaced.
- Active mission limit enforcement is sufficient for local single-user interactions and is covered by service tests.

## Risks

- Playwright E2E needs a downloaded browser binary; CDN timeouts can block that command locally.
- Cookie auth depends on same-site local development settings matching `localhost`.
- Active mission activation is not serialized for high-concurrency production use.
- Startup-driven table creation is not a production migration strategy.

## Open questions

- Whether to introduce Alembic migrations before any non-local deployment.
- Whether refresh-session storage should support device/session management UI after MVP.

## Initial implementation plan

1. Add Docker Compose and service scaffolds for web, gateway, identity, checkpoint, Postgres, and Redis.
2. Implement identity auth, preferences, refresh session rotation, and tests.
3. Implement checkpoint domain models, Today composition, mission activation/parking, checkpoint creation, parking CRUD, and tests.
4. Implement the gateway `/api` contract with cookie auth and active-limit coordination.
5. Implement the minimalist React UI with protected routes, foldable rail, Start Ritual, Stop Ritual, Life Index, Parking, and Settings.
6. Add frontend tests, Playwright E2E spec, Docker health checks, and README.
7. Verify with backend tests, frontend tests, Docker health checks, and browser QA.

## Verification plan

- `docker compose up --build -d`
- `docker compose ps`
- `.venv/bin/python -m pytest services/identity-service/tests`
- `.venv/bin/python -m pytest services/checkpoint-service/tests`
- `cd web && npm run build`
- `cd web && npm test -- --run`
- `cd web && npm run e2e`
- Browser QA at desktop and mobile widths for `/today`
- Browser interaction QA for signup/login, mission creation, checkpoint creation, and Today refresh
