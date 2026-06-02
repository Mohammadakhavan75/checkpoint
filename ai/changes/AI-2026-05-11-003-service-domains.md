# AI Change Record: Service Domains And Distributed Hosts

## Change ID

`AI-2026-05-11-003`

## Task ID

`TASK-0006`

## Summary

Changed local service URLs to derive from environment variables with `infiniteai.space` as the default domain, documented distributed-host deployment requirements, added a repeatable Docker image build/push script, and made API gateway cookie SameSite behavior configurable for cross-site web/API deployments.

## Motivation

The stack previously exposed browser-facing URLs through `localhost` and routed gateway-to-service traffic through raw Docker service names. The user wants to build Docker images per service, push them to Docker Hub, and deploy containers on different hosts while preserving the existing containerized service model.

## Behavior before

The web app defaulted to `http://localhost:8000`, the API gateway defaulted to `http://localhost:8001` and `http://localhost:8002`, and Compose used `identity-service` / `checkpoint-service` for internal upstream URLs. API gateway cookies always used `SameSite=Lax`, which blocks credentialed browser requests when the web and API are deployed on different sites.

## Behavior after

The web app defaults to `http://api.infiniteai.space:8000`, the frontend origin defaults to `http://infiniteai.space:5173`, and the gateway defaults to `http://identity.infiniteai.space:8001` and `http://checkpoint-service.infiniteai.space:8002`. These are derived from `DOMAIN_NAME`, `WEB_HOST`, `API_HOST`, `IDENTITY_HOST`, and `CHECKPOINT_HOST`, while explicit full URL overrides remain available. Docker Compose provides matching network aliases.

The gateway also supports `COOKIE_SAMESITE`, defaulting to `lax` for local development. Cross-site deployments can set `COOKIE_SAMESITE=none` with `COOKIE_SECURE=true`; the gateway rejects `COOKIE_SAMESITE=none` without secure cookies.

Docker images can be built and pushed through `scripts/docker_images.sh` without changing service Dockerfiles.

## Files changed

- `.env.example`
- `README.md`
- `docker-compose.yml`
- `docs/deployment/distributed-hosts.md`
- `docs/architecture/index.md`
- `ai/context/subsystem-api-gateway.md`
- `services/api-gateway/app/main.py`
- `services/api-gateway/pytest.ini`
- `services/api-gateway/tests/test_cookie_settings.py`
- `scripts/check_ai_change_policy.py`
- `scripts/docker_images.sh`
- `web/src/lib/api.ts`
- `ai/context-packs/006-service-domains.md`
- `ai/tasks/TASK-0006-service-domains/plan.md`
- `ai/changes/AI-2026-05-11-003-service-domains.md`
- `ai/changes/AI-2026-05-11-003-service-domains.yaml`

## Design decisions

- Kept service ports unchanged to avoid introducing a reverse proxy or TLS into the local development stack.
- Left container healthchecks on `localhost` because those checks intentionally target the process inside the same container.
- Documented `/etc/hosts` entries required for local browser DNS resolution.
- Used `DOMAIN_NAME=infiniteai.space` as the shared default while preserving explicit host and URL overrides for distributed deployments.
- Added a script around the existing service Dockerfiles rather than changing service deployment behavior.
- Preserved `SameSite=Lax` as the local default and made `SameSite=None` an explicit production setting because it requires HTTPS secure cookies.
- Documented that identity-service and checkpoint-service must be private or firewall-restricted because they trust gateway-supplied internal headers.

## Alternatives considered

### Add a reverse proxy

Rejected for this change because it would add another service and broaden scope. The requested domain names can be supported with Compose aliases plus local host mappings.

### Add service-to-service authentication now

Rejected for this change because it would change internal trust contracts and require a broader security design. Network isolation is documented as the current deployment requirement.

## Invariants preserved

- API paths and payload shapes are unchanged.
- Gateway auth still derives identity from cookies and forwards `X-User-Id` internally.
- No storage or schema changes are required.
- Cross-site cookies fail closed when configured without `Secure`.

## Tests added or updated

- `services/api-gateway/tests/test_cookie_settings.py`

## Verification commands run

```bash
.venv/bin/python -m pytest services/api-gateway/tests
python3 -m py_compile services/api-gateway/app/main.py scripts/check_ai_change_policy.py
bash -n scripts/docker_images.sh
docker compose config
docker compose config >/tmp/checkpoint-compose-config.txt && rg 'infiniteai\.space|checkpoint\.com' /tmp/checkpoint-compose-config.txt
cd web && npm test -- --run
cd web && npm run build
scripts/docker_images.sh build checkpoint-local distributed-host-audit
docker images --format '{{.Repository}}:{{.Tag}}' | rg '^checkpoint-local/checkpoint-(web|api-gateway|identity-service|service):distributed-host-audit$'
git diff --check
```

## Verification result

Frontend tests passed with 5 files and 9 tests. Frontend build passed. API gateway cookie/default-address tests passed with 4 tests. API gateway, AI policy script, and Docker image script syntax checks passed. Docker Compose config rendered successfully with `infiniteai.space` defaults and no `checkpoint.com` matches. The image script built all four local images under `checkpoint-local/*:distributed-host-audit`, and `docker images` confirmed the expected tags. Whitespace check passed.

## Rollback plan

Revert the URL/default/env/README/docs changes, remove the Compose network aliases, remove `COOKIE_SAMESITE`, remove `scripts/docker_images.sh`, and remove the gateway cookie tests. No data rollback is required.

## Known risks

- Local browser access requires the documented host mappings.
- Production should use HTTPS and `COOKIE_SECURE=true`; local Compose keeps HTTP for local development only.
- The current web image uses the Vite server. A future static-server production image would need build-time or runtime-file API origin handling.
- Public exposure of identity-service or checkpoint-service is unsafe without firewall/private networking or a future service-auth layer.

## Follow-up work

- Add a production static-server web image instead of using the Vite dev server.
- Add service-to-service authentication if identity-service or checkpoint-service must be reachable outside a private network.
