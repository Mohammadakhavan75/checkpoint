# Context Pack: TASK-0002 Parking Consistency

## Task
Fix the parking feature inconsistency: parked missions created from Life Index should appear on the Parking page, and standalone parking items created from the Parking page should appear in the Life Index parking section.

## Branch
- Requested branch name: `fix bug parking feature`
- Actual branch name: `fix-bug-parking-feature`
- Reason: Git rejects branch names containing spaces.

## Subsystems affected
- Web: `LifeIndexPage` and `ParkingPage` presentation of parking data.
- Checkpoint service: existing mission and parking-item APIs are consumed but not changed.
- API gateway: existing proxy routes are consumed but not changed.

## Context read
- `ai/context/repo-map.md`
- `ai/context/subsystem-web.md`
- `ai/context/subsystem-checkpoint.md`
- `ai/context/subsystem-api-gateway.md`
- `ai/context/testing-guidelines.md`
- `ai/context/coding-guidelines.md`
- `docs/invariants/api-compatibility.md`
- `docs/invariants/concurrency.md`
- `docs/invariants/security.md`
- `docs/invariants/storage.md`

## Current behavior
- Life Index loads only `api.missions()` and renders parked missions in its parking section.
- Parking page loads only `api.parkingItems()` and renders standalone parking items.
- The backend Today composition already treats parking as the sum of `ParkingItem` rows and parked `Mission` rows.

## Implementation plan
1. Keep the existing public API unchanged to avoid compatibility risk.
2. Update `ParkingPage` to load parked missions in addition to standalone parking items.
3. Render parked missions on the Parking page with an Activate action, while retaining delete support for standalone parking items.
4. Update `LifeIndexPage` to load standalone parking items in addition to missions.
5. Render standalone parking items in the Life Index parking section without mission-only actions.
6. Add focused React component tests covering both cross-page visibility directions.
7. Run targeted frontend tests and, if feasible, the full frontend test suite.
8. Prepare the branch for `docker compose up` by running frontend/backend verification plus Docker Compose config/build checks.

## Relevant tests identified before code edits
- Add `web/src/pages/ParkingPage.test.tsx` for parked mission visibility on the Parking page.
- Add `web/src/pages/LifeIndexPage.test.tsx` for standalone parking item visibility in Life Index.
- Run `cd web && npm test -- --run`.
- Run `cd web && npm run build`.
- Run `.venv/bin/python -m pytest services/checkpoint-service/tests`.
- Run `.venv/bin/python -m pytest services/identity-service/tests`.
- Run `docker compose config`.
- Run `docker compose build` if Docker is available.
- Backend tests are not expected to require changes because no service/API behavior is planned to change.

## Invariant review
- API compatibility: preserved by reusing existing `/api/missions` and `/api/parking-items` endpoints without shape changes.
- Security: preserved because all loaded data continues through authenticated gateway routes and service-level user scoping.
- Storage: no schema or persistence changes planned.
- Concurrency: no shared mutable server state changes planned; page loads remain eventual-refresh UI reads.

## Risks
- The UI may make two requests per page instead of one; risk is low for the MVP and keeps API compatibility.
- Parking page now shows two item types, so labels must make mission activation versus item deletion clear.
- If one request fails, the page currently reports the relevant action error; loading error behavior remains minimal.

## Rollback plan
Revert changes to `LifeIndexPage`, `ParkingPage`, and their new tests. No data migration or cleanup is required.
