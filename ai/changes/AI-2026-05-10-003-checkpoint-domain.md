# AI Change Record: Checkpoint Domain Service

## Change ID

`AI-2026-05-10-003`

## Task ID

`TASK-0001`

## Summary

Added the checkpoint domain service with domains, missions, checkpoints, parking items, Today composition, mission activation, and parking behavior.

## Motivation

The MVP needs durable personal continuity data with strict per-user isolation and an active mission limit.

## Behavior before

No mission, checkpoint, domain, Today, or parking APIs existed.

## Behavior after

The checkpoint service stores user-scoped domain objects, composes Today, enforces active limits supplied by the gateway, updates mission resume fields when checkpoints are created, and supports parking CRUD.

## Files changed

- `services/checkpoint-service/app/database.py`
- `services/checkpoint-service/app/main.py`
- `services/checkpoint-service/app/models.py`
- `services/checkpoint-service/app/schemas.py`
- `services/checkpoint-service/tests/test_checkpoint.py`
- `services/checkpoint-service/pytest.ini`

## Design decisions

- Every persisted domain object includes `user_id`.
- The gateway supplies active limit from preferences to keep identity preferences in one place.
- Checkpoint creation denormalizes resume fields onto the mission for fast Today display.

## Alternatives considered

### Store Today as a separate table

Rejected because Today is a composition of missions, checkpoints, and parking count in the MVP.

### Let users activate unlimited missions

Rejected because the product rule requires active limit defaulting to one.

## Invariants reviewed

- `docs/invariants/security.md`
- `docs/invariants/storage.md`
- `docs/invariants/concurrency.md`

## Invariants preserved

- Cross-user access returns 404.
- Active mission limit is enforced on create and activate.
- Parking items are scoped by `user_id`.

## Tests added or updated

- `services/checkpoint-service/tests/test_checkpoint.py`

## Verification commands run

```bash
.venv/bin/python -m pytest services/checkpoint-service/tests
```

## Verification result

Passed: 2 tests.

## Rollback plan

Revert the checkpoint service commit and remove dependent gateway/frontend domain routes. For local Docker data, remove the Postgres volume only if local mission/checkpoint data loss is acceptable.

## Known risks

- Active-limit checks are not serialized for production-grade concurrent writes.
- Startup metadata creation is not a production migration system.

## Follow-up work

- Add database migrations and transaction-level active-limit protection before production.
