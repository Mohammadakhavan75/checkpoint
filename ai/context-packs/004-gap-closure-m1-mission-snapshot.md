# Context Pack: 004 Gap Closure M1 Mission Snapshot

## Task
Implement M1 from `docs/plans/gap-closure-plan.md`: add a first-class Mission Snapshot screen with inline-editable state fields and checkpoint history.

## Subsystems affected
- Web: new mission snapshot route, page, navigation links, tests, and light styling.
- Checkpoint service/API gateway: existing `PATCH /missions/{id}` and `GET /missions/{id}/checkpoints` endpoints are consumed but not changed.

## Context read
- `ai/context/repo-map.md`
- `docs/plans/gap-closure-plan.md`
- `ai/context/subsystem-web.md`
- `ai/context/subsystem-checkpoint.md`
- `ai/context/subsystem-api-gateway.md`
- `ai/context/testing-guidelines.md`
- `ai/context/coding-guidelines.md`
- `docs/invariants/api-compatibility.md`
- `docs/invariants/security.md`
- `docs/invariants/storage.md`
- `docs/invariants/concurrency.md`

## Current behavior
- `/missions/:missionId` routes to `LifeIndexPage`, so there is no mission-specific snapshot screen.
- Today exposes a partial read-only snapshot behind `Show more`.
- Life Index mission titles are plain text and cannot open mission detail.
- Existing APIs already expose mission update and checkpoint history.

## Implementation plan
1. Add `api.mission(id)` if needed by the snapshot page, using existing public API shape.
2. Create `MissionSnapshotPage` with route-param loading for the mission and checkpoints.
3. Implement keyboard-accessible inline editing for the nine snapshot fields; blur/Ctrl+Enter saves and Esc cancels.
4. Render checkpoint history reverse-chronologically with compact expandable details.
5. Route `/missions/:missionId` to `MissionSnapshotPage`.
6. Link Today's primary mission title and Life Index mission titles to the snapshot route.
7. Add `MissionSnapshotPage.test.tsx` covering render, inline save, and history ordering.
8. Run focused frontend tests and build.

## Relevant tests identified before code edits
- Add `web/src/pages/MissionSnapshotPage.test.tsx`.
- Run `cd web && npm test -- --run`.
- Run `cd web && npm run build`.

## Invariant review
- API compatibility: preserved; no endpoint or response shape changes planned.
- Security: preserved; all reads/writes use existing authenticated API client paths.
- Storage: no schema or persistence model changes planned.
- Concurrency: snapshot edits are last-write-wins PATCH calls; no server synchronization changes planned.

## Risks
- Inline blur saves may surprise users if accidental edits are made; Esc cancels before blur.
- Multiple rapid edits can race at the UI level; each field saves independently and refreshes local state from the returned mission.

## Rollback plan
Revert the new snapshot page/test, route/link changes, API helper addition, and style additions. No data migration or cleanup is required.

## Verification
- `cd web && npm test -- --run` passed with 5 test files and 7 tests.
- `cd web && npm run build` passed.
