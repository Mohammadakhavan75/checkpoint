# Task Plan: TASK-0004 Gap Closure M1 Mission Snapshot

## Goal
Implement M1 from `docs/plans/gap-closure-plan.md`: make `/missions/:missionId` a dedicated Mission Snapshot screen with editable state fields and checkpoint history.

## Steps
1. Read required repo context, subsystem summaries, invariants, and gap-closure plan.
2. Create the task context pack before code edits.
3. Add a route-specific `MissionSnapshotPage` using existing mission/checkpoint APIs.
4. Implement inline editing for mission snapshot fields with keyboard support.
5. Render checkpoint history newest-first with read-only expandable details.
6. Link mission titles from Today and Life Index to the snapshot route.
7. Add focused component tests for rendering, inline save, and checkpoint history.
8. Run frontend tests and build verification.
9. Update subsystem summary and AI change record.

## Test Plan
- `cd web && npm test -- --run`
- `cd web && npm run build`

## Rollback Plan
Revert the new snapshot page/test, route/link changes, related CSS, subsystem summary update, task context pack, task plan, and AI change record. No data migration or cleanup is required.
