# Context Pack: 002-parking-missions

## Task
Unify the concept of "Parking" and "Missions". Parked items should simply be missions with the status "parked". Ensure the "Park something" form creates missions, and allow missions to be deleted from both the Parking page and the Life Index page. Add an explicit "Activate" button next to "Park" when creating a new mission from the parking page.

## Subsystems affected
- Web: `ParkingPage.tsx`, `LifeIndexPage.tsx`, `api.ts`
- API gateway: Backend `main.py` for Checkpoint Service (added delete mission endpoint)

## Context
Previously, "Parking items" and "Parked missions" were distinct entities with different data models, causing UI confusion and redundant implementations. This task consolidates "Park something" to create parked missions instead. It also provides CRUD parity by adding an explicit DELETE endpoint for missions, accessible via Trash icons in the UI.

## Implementation Plan
1. Backend: Add `DELETE /missions/{mission_id}` endpoint to `checkpoint-service`.
2. Frontend API: Add `api.deleteMission` in `lib/api.ts`.
3. `LifeIndexPage.tsx`:
   - Add `removeMission` logic.
   - Update `MissionRow` to display a `<Trash2>` button next to the primary action.
4. `ParkingPage.tsx`:
   - Refactor "Park something" form labels from Title/Note to Mission/Action.
   - Re-route form submission to `api.createMission` rather than `api.createParkingItem`.
   - Add an `Activate` button next to the `Park` button in the creation form.
   - Add `<Trash2>` button for parked missions in the "Safe for later" list.

## Relevant Tests
- `npm run test` for frontend components.
- `pytest` for backend API.
