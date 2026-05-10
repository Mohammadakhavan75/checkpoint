# AI Change Record: Parking Consistency

## Change ID

`AI-2026-05-10-007`

## Task ID

`TASK-0002`

## Summary

Made the web Parking and Life Index pages present the same safe-for-later set by loading both parked missions and standalone parking items.

## Motivation

Users saw parking data split by creation location: parked missions created from Life Index did not appear on Parking, and parking items created from Parking did not appear in the Life Index parking section.

## Behavior before

Life Index only displayed parked missions from `/api/missions`, while Parking only displayed standalone items from `/api/parking-items`.

## Behavior after

Life Index displays parked missions and standalone parking items in the parking section. Parking displays standalone parking items and parked missions, with parked missions still offering activation.

## Files changed

- `ai/context-packs/TASK-0002-parking-consistency.md`
- `ai/context/subsystem-web.md`
- `web/src/pages/LifeIndexPage.tsx`
- `web/src/pages/ParkingPage.tsx`
- `web/src/pages/LifeIndexPage.test.tsx`
- `web/src/pages/ParkingPage.test.tsx`

## Design decisions

- Reused existing `/api/missions?status=parked` and `/api/parking-items` endpoints to preserve API compatibility.
- Kept mission activation available only for parked missions and item deletion available only for standalone parking items.
- Left backend storage unchanged because Today already composes parking count from both sources.

## Alternatives considered

### Add a combined parking endpoint

Rejected for this bugfix because it would expand the public API surface and require gateway/service contract changes.

### Convert parking items into missions

Rejected because standalone parking items and missions have different fields and actions in the current data model.

## Invariants preserved

- API compatibility is preserved; no public endpoint or response shape changed.
- Security is preserved; all data still flows through authenticated, user-scoped existing routes.
- Storage is unchanged; no migration or data cleanup is required.
- Concurrency-sensitive server behavior is unchanged.

## Tests added or updated

- Added `web/src/pages/LifeIndexPage.test.tsx`.
- Added `web/src/pages/ParkingPage.test.tsx`.

## Verification commands run

```bash
cd web && npm test -- --run
git diff --check
```

## Verification result

`npm test -- --run` passed with 4 test files and 4 tests. `git diff --check` completed with no whitespace errors.

## Rollback plan

Revert the changes to `LifeIndexPage`, `ParkingPage`, the two new page tests, `ai/context/subsystem-web.md`, this change record, and the task context pack. No database rollback is required.

## Known risks

- Each affected page now performs two API reads instead of one.
- Node/npm were installed in the local environment to run frontend verification.

## Follow-up work

- Run `cd web && npm run build` before merging if a production bundle check is required.
