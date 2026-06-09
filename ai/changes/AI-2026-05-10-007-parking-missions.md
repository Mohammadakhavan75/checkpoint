# AI Change Record: Unify Parking and Missions

## Change ID
`AI-2026-05-10-007`

## Task ID
`TASK-002`

## Summary
Unified the concept of Parking and Missions by updating the "Park something" UI to create missions directly (with `status="parked"` or `status="active"`). Added a `DELETE /missions/{mission_id}` endpoint to the backend to support deleting missions from the Parking and Life Index pages.

## Motivation
To simplify the mental model of the application. There should be no difference between a "parking item" and a "parked mission".

## Behavior before
- The "Park something" form on the Parking page created instances of `ParkingItem`, which lacked state management like "Activate".
- There was no way to delete a mission from the UI.
- The creation form asked for "Title" and "Note".

## Behavior after
- The "Park something" form creates a `Mission` with fields "Mission" and "Action".
- Users can choose to `Park` or `Activate` immediately from the form.
- Users can delete a mission (both active and parked) via a new trash icon on the Life Index and Parking pages.
- Backend now supports `DELETE /missions/{mission_id}`.

## Files changed
- `services/checkpoint-service/app/main.py`
- `web/src/lib/api.ts`
- `web/src/pages/ParkingPage.tsx`
- `web/src/pages/LifeIndexPage.tsx`

## Design decisions
- The legacy `ParkingItem` objects are still rendered on the page to prevent data loss, but the primary interaction is now fully centered around `Mission` objects.
- Both Life Index and Parking pages reuse the `Trash2` icon for consistent deletion UX.

## Alternatives considered
- Writing a database migration to convert all `ParkingItem` objects into `Mission` objects. Decided against it for MVP scope; legacy rendering solves the problem transparently.

## Verification result
All backend unit tests and frontend component tests pass seamlessly without regressions.
