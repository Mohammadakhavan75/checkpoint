# Subsystem Summary: Web

## Responsibility

The web subsystem owns the authenticated React application, route protection, minimal ADHD-friendly screens, API client calls, and local interaction state.

## Non-responsibilities

The web app does not authorize data access, persist durable domain data directly, manage refresh sessions, or enforce active mission limits.

## Main entry points

- `web/src/App.tsx`
- `web/src/lib/auth.tsx`
- `web/src/lib/api.ts`
- `web/src/components/AppShell.tsx`
- `web/src/pages/TodayPage.tsx`
- `web/src/pages/StopCheckpointPage.tsx`
- `web/src/pages/MissionSnapshotPage.tsx`

## Important dependencies

- React
- React Router
- Vite
- TypeScript
- Lucide React icons

## Important invariants

- The first authenticated route is `/today`, not a dashboard or landing page.
- The side rail defaults to compact icon-only navigation and persists through user preferences.
- Start Ritual keeps history, blockers, full snapshots, and parked lists behind explicit disclosure.
- Stop Ritual asks only the approved five checkpoint questions.
- Parking views show both parked missions and standalone parking items so users see the same safe-for-later set from Life Index and Parking.
- Mission Snapshot is the dedicated re-entry screen for editable state fields and immutable checkpoint history.

## Common failure modes

- Cookie-based auth requires gateway and frontend origins to align with CORS and browser cookie rules.
- Long mission or checkpoint text can cause mobile overflow if grid children are not allowed to shrink.
- Playwright E2E cannot run until the local Playwright browser binary is installed.

## Tests

- `web/src/pages/TodayPage.test.tsx`
- `web/src/pages/LifeIndexPage.test.tsx`
- `web/src/pages/ParkingPage.test.tsx`
- `web/src/pages/MissionSnapshotPage.test.tsx`
- `web/src/components/AppShell.test.tsx`
- `web/e2e/checkpoint.spec.ts`

## Related ADRs

- None for the MVP.

## Agent notes

Favor sparse UI changes and verify responsive layouts with screenshots before claiming visual completion.
