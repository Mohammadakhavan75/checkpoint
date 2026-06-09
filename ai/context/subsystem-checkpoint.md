# Subsystem Summary: Checkpoint Domain

## Responsibility

The checkpoint service owns user-scoped domains, missions, checkpoints, parking items, Today composition, and mission activation/parking state.

## Non-responsibilities

It does not authenticate browser requests, issue cookies, store passwords, or own user preferences.

## Main entry points

- `services/checkpoint-service/app/main.py`
- `services/checkpoint-service/app/models.py`
- `services/checkpoint-service/app/schemas.py`

## Important dependencies

- FastAPI
- SQLAlchemy
- Postgres in Docker
- SQLite for local service tests

## Important invariants

- Every domain object includes `user_id`; queries and mutations must filter or verify ownership.
- Mission activation honors the active limit supplied by the gateway.
- Creating a checkpoint also updates the mission resume fields used by Today.
- Parking item CRUD must be scoped to the authenticated user.

## Common failure modes

- Missing or incorrect `X-User-Id` should not expose data.
- Active mission count checks are not serialized for high-concurrency production use; acceptable for local MVP.
- Startup creates MVP tables with SQLAlchemy metadata and is not a production migration system.

## Tests

- `services/checkpoint-service/tests/test_checkpoint.py`

## Related ADRs

- None for the MVP.

## Agent notes

Storage and cross-user isolation changes require tests before merge.
