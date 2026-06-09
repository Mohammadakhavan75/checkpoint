# Task Plan: TASK-0005 Gap Closure M2-M5

## Goal
Complete M2 through M5 from `docs/plans/gap-closure-plan.md` while verifying after each milestone.

## Steps
1. Implement M2 shared mission creation form with optional stateful fields.
2. Verify M2 with frontend tests and build.
3. Implement M4 active primary/secondary tiers with hard cap, promote/demote, ADR, and tests.
4. Verify M4 with checkpoint service tests, frontend tests, and build.
5. Implement M3 domain UI, domain delete safety, and grouping.
6. Verify M3 with checkpoint service tests, frontend tests, and build.
7. Implement M5 Life Index boot-screen composition.
8. Verify M5 with frontend tests and build.
9. Run final compose/config checks and update change records.

## Test Plan
- `.venv/bin/python -m pytest services/checkpoint-service/tests`
- `cd web && npm test -- --run`
- `cd web && npm run build`
- `docker compose config`

## Rollback Plan
Revert changes by milestone in reverse order. Since the plan avoids schema changes, rollback requires code/doc revert only; local data may need manual active-rank cleanup if M4 was exercised before rollback.
