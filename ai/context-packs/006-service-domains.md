# Context Pack: 006 Service Domains And Distributed Hosts

## Task
Make service communication configurable enough for each containerized service to run on a separate host while preserving the existing container deployment model. The user wants to build images per service and push them to Docker Hub, then deploy web/API/services on different hosts such as DigitalOcean and AWS. Follow-up request: make every service address environment-variable driven and use `infiniteai.space` as the configurable domain default.

## Subsystems affected
- Docker Compose: service environment URLs and Docker network aliases.
- API gateway: default upstream service URLs and frontend CORS origin.
- Web: default public API base URL.
- Docs: local host mapping instructions and distributed-host deployment requirements.
- Scripts: repeatable Docker image build/push commands for the four service images.
- AI policy script: recognizes API gateway tests as test evidence.

## Context read
- `ai/context/repo-map.md`
- `ai/context/subsystem-api-gateway.md`
- `ai/context/subsystem-identity.md`
- `ai/context/subsystem-checkpoint.md`
- `ai/context/subsystem-web.md`
- `docs/invariants/api-compatibility.md`
- `docs/invariants/security.md`
- `docs/invariants/storage.md`
- `docs/invariants/concurrency.md`

## Current behavior
- Browser-facing URLs are derived from `DOMAIN_NAME`, defaulting to `infiniteai.space`.
- Gateway upstreams are environment-configurable with defaults for `identity.infiniteai.space` and `checkpoint-service.infiniteai.space`.
- Web API base URL is environment-configurable via `VITE_API_BASE_URL`.
- API gateway CORS allows one configured `FRONTEND_ORIGIN`.
- API gateway auth cookies are HttpOnly and currently always use `SameSite=Lax`.
- Compose healthchecks use `localhost` from inside each container to check the process in that same container.

## Distributed-host communication inventory
- Browser -> web: public host serving the Vite app container.
- Browser -> API gateway: public `VITE_API_BASE_URL`; requires CORS `FRONTEND_ORIGIN` and credentialed requests.
- API gateway -> identity service: `IDENTITY_SERVICE_URL` over HTTP(S), with 10 second HTTPX timeouts.
- API gateway -> checkpoint service: `CHECKPOINT_SERVICE_URL` over HTTP(S), with 10 second HTTPX timeouts and `X-User-Id` forwarding.
- Identity service -> Postgres: `DATABASE_URL`.
- Identity service -> Redis: `REDIS_URL` for refresh sessions.
- Checkpoint service -> Postgres: `DATABASE_URL`.
- No direct web -> identity/checkpoint calls; the browser only calls the API gateway.

## Requirements for separate hosts
- Each service image can be built from its existing Dockerfile; deployment must supply service-specific environment variables at runtime.
- Web deploy must set `VITE_API_BASE_URL` to the externally reachable API gateway origin. The current web container runs the Vite server, so this value is read at container startup.
- API gateway must set `FRONTEND_ORIGIN` to the exact deployed web origin.
- If web and API are on different sites, API gateway cookies must use `COOKIE_SAMESITE=none` and `COOKIE_SECURE=true`, and the API gateway must be served over HTTPS.
- API gateway must set `IDENTITY_SERVICE_URL` and `CHECKPOINT_SERVICE_URL` to addresses reachable from the gateway host.
- Identity and checkpoint services trust gateway-provided internal requests; do not expose them publicly unless protected by firewall/private networking or a future service-to-service auth layer.
- Identity and checkpoint services need reachable Postgres; identity also needs reachable Redis. Managed Postgres/Redis or private-network containers are acceptable, but credentials must not be committed.
- `JWT_SECRET` must be identical for API gateway and identity service.

## Implementation plan
1. Introduce `DOMAIN_NAME=infiniteai.space` and host variables for web/API/identity/checkpoint.
2. Derive local default origins and upstream URLs from those variables in Compose, API gateway, and web client fallback.
3. Keep explicit URL overrides (`VITE_API_BASE_URL`, `FRONTEND_ORIGIN`, `IDENTITY_SERVICE_URL`, `CHECKPOINT_SERVICE_URL`, `DATABASE_URL`, `REDIS_URL`) for distributed hosts.
4. Keep default local cookie behavior as `SameSite=Lax` and `COOKIE_SECURE=false`; keep `SameSite=None` fail-closed unless secure.
5. Keep the Docker image build/push script.
6. Document `infiniteai.space` host mappings and runtime variable overrides.
7. Add or update focused tests for derived domain defaults and cookie settings.
8. Verify gateway tests, syntax, script syntax, frontend tests/build, diff whitespace, and Docker Compose config.

## Tests identified before edits
- `services/api-gateway/tests/test_cookie_settings.py`
- `.venv/bin/python -m pytest services/api-gateway/tests` or `python3 -m pytest services/api-gateway/tests`
- `docker compose config`
- `bash -n scripts/docker_images.sh`
- `cd web && npm test -- --run`
- `cd web && npm run build`

## Invariant review
- API compatibility: endpoint paths and payloads are unchanged; only hostnames/origins/cookie attributes change.
- Security: cookie/CORS behavior must allow the configured frontend origin and continue to fail closed for other origins. Cross-site cookies require `Secure`; identity/checkpoint services must remain private or gain service authentication before public exposure.
- Storage: no storage impact.
- Concurrency: existing explicit HTTPX timeouts remain in place; no retry/concurrency behavior changes.

## Risks
- Browser DNS for `infiniteai.space` and subdomains requires host mappings in local development.
- Plain HTTP with a real-looking domain is local-development only.
- Cross-site deployment requires HTTPS and `COOKIE_SECURE=true`; otherwise browsers reject `SameSite=None` cookies.
- The current web image runs the Vite dev server; a future production static-server image would need build-time or runtime-file API origin handling.
- Publicly exposing identity/checkpoint services would let callers spoof `X-User-Id`; they must be network-restricted unless service auth is added.

## Rollback plan
Revert Docker Compose hostname/env changes, API/web default URL changes, cookie SameSite configuration, gateway tests, and README/deployment documentation updates.

## Verification
- `.venv/bin/python -m pytest services/api-gateway/tests` passed with 4 tests.
- `python3 -m py_compile services/api-gateway/app/main.py` passed.
- `docker compose config` passed.
- `docker compose config >/tmp/checkpoint-compose-config.txt && rg 'infiniteai\.space|checkpoint\.com' /tmp/checkpoint-compose-config.txt` showed the expected `infiniteai.space` defaults and no `checkpoint.com` matches.
- `bash -n scripts/docker_images.sh` passed.
- `scripts/docker_images.sh build checkpoint-local distributed-host-audit` passed and built all four local images.
- `docker images --format '{{.Repository}}:{{.Tag}}' | rg '^checkpoint-local/checkpoint-(web|api-gateway|identity-service|service):distributed-host-audit$'` found the four expected images.
- `cd web && npm test -- --run` passed with 5 files and 9 tests.
- `cd web && npm run build` passed.
- `python3 -m py_compile scripts/check_ai_change_policy.py` passed.
- `git diff --check` passed.
