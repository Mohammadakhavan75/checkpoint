# Subsystem Summary: Identity

## Responsibility

The identity service owns user accounts, password hashing, access token issuance, refresh session rotation, logout session deletion, and per-user preferences.

## Non-responsibilities

It does not own missions, checkpoints, parking items, or browser cookie setting. The gateway translates identity tokens into cookies.

## Main entry points

- `services/identity-service/app/main.py`
- `services/identity-service/app/security.py`
- `services/identity-service/app/models.py`
- `services/identity-service/app/schemas.py`

## Important dependencies

- FastAPI
- SQLAlchemy
- Passlib bcrypt
- PyJWT
- Redis

## Important invariants

- Passwords are stored only as hashes.
- Refresh sessions are server-side state and rotate on refresh.
- Default preferences are `nav_collapsed=true` and `active_limit=1`.
- Invalid login and invalid refresh fail closed with HTTP 401.

## Common failure modes

- Redis must be available in Docker; tests use an in-memory session store.
- Startup creates MVP tables with SQLAlchemy metadata and is not a production migration system.
- Email uniqueness is enforced at the database and converted to HTTP 409.

## Tests

- `services/identity-service/tests/test_identity.py`

## Related ADRs

- None for the MVP.

## Agent notes

Authentication changes are security-sensitive; read `docs/invariants/security.md` before editing.
