# AI Change Record: Gap Closure M1 Mission Snapshot

## Change ID

`AI-2026-05-11-001`

## Task ID

`004`

## Summary

Implemented the Mission Snapshot screen from M1 of `docs/plans/gap-closure-plan.md`.

## Motivation

The gap plan identifies `/missions/:missionId` as a stub route and calls for a first-class re-entry screen where users can read full mission state, edit stateful fields, and review checkpoint history.

## Behavior before

`/missions/:missionId` rendered `LifeIndexPage`. Mission state was only partially visible on Today behind `Show more`, and checkpoint history was not visible in the web UI.

## Behavior after

`/missions/:missionId` renders `MissionSnapshotPage`. Users can edit nine snapshot fields inline, open mission snapshots from Today or Life Index, and review reverse-chronological immutable checkpoint history.

## Files changed

- `ai/context-packs/004-gap-closure-m1-mission-snapshot.md`
- `ai/tasks/TASK-0004-gap-closure-m1/plan.md`
- `ai/context/subsystem-web.md`
- `ai/changes/AI-2026-05-11-001-gap-m1-mission-snapshot.md`
- `ai/changes/AI-2026-05-11-001-gap-m1-mission-snapshot.yaml`
- `web/src/App.tsx`
- `web/src/pages/TodayPage.tsx`
- `web/src/pages/LifeIndexPage.tsx`
- `web/src/pages/MissionSnapshotPage.tsx`
- `web/src/pages/MissionSnapshotPage.test.tsx`
- `web/src/styles/app.css`

## Design decisions

- Reused existing `api.missions()`, `api.checkpoints()`, and `api.updateMission()` calls to avoid public API changes.
- Sorted checkpoint history client-side to guarantee newest-first display even if an upstream response changes order.
- Kept historical checkpoints read-only, matching the plan's immutable checkpoint constraint.

## Alternatives considered

### Add a single-mission GET endpoint

Rejected for M1 because the existing mission list endpoint is sufficient and avoids an API contract change.

### Add checkpoint editing

Rejected because checkpoints are intended to remain immutable; corrections should be captured by a later checkpoint.

## Invariants preserved

- API compatibility is preserved; no endpoint or response shape changed.
- Security is preserved; all data access remains through authenticated gateway routes.
- Storage is unchanged; no migration is required.
- Concurrency semantics are unchanged; inline edits use last-write-wins PATCH behavior.

## Tests added or updated

- Added `web/src/pages/MissionSnapshotPage.test.tsx`.

## Verification commands run

```bash
cd web && npm test -- --run
cd web && npm run build
```

## Verification result

Frontend tests passed with 5 test files and 7 tests. Production build passed.

## Rollback plan

Revert `MissionSnapshotPage`, its test, route/link updates, related CSS, the web subsystem summary update, and this task/change record. No data rollback is required.

## Known risks

- Loading a single snapshot currently fetches the mission list and selects by id; acceptable for the current small local-first MVP.
- Simultaneous edits from multiple tabs remain last-write-wins.

## Follow-up work

- Continue with M2 from the gap closure plan: shared mission creation form with optional stateful fields.
