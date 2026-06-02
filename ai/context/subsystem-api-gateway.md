# Subsystem Summary: API Gateway

## Responsibility

The API gateway owns the public `/api` interface, CORS, HttpOnly auth cookies, access token validation, refresh-cookie recovery for `/api/auth/me`, and proxying authenticated user requests to internal services.

## Non-responsibilities

The gateway does not store user records, mission records, or refresh sessions. It does not replace service-level user scoping.

## Main entry points

- `services/api-gateway/app/main.py`
- `services/api-gateway/app/security.py`

## Important dependencies

- FastAPI
- HTTPX
- PyJWT

## Important invariants

- Public API routes requiring a user must derive `user_id` from a valid access token cookie.
- Internal checkpoint service calls must include `X-User-Id`.
- Refresh tokens remain HttpOnly cookies and are sent only to the identity service.
- Active mission create/activate calls must pass the user's current active limit from preferences.

## Common failure modes

- Returning raw FastAPI unions can trigger response-model inference errors; gateway proxy handlers use `response_model=None`.
- Cookie settings must use `secure=true` only when served over HTTPS.
- Cross-site web/API deployments require `COOKIE_SAMESITE=none` together with `COOKIE_SECURE=true`.
- Default service addresses derive from `DOMAIN_NAME` and service host variables, currently defaulting to `infiniteai.space`.
- Upstream service errors should pass through without leaking token values.

## Tests

- `services/api-gateway/tests/test_cookie_settings.py`
- Covered indirectly by service tests and browser/API smoke flows for the MVP.

## Related ADRs

- None for the MVP.

## Agent notes

Any public API shape change must be reflected in frontend types and API compatibility notes.
