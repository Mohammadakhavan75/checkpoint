# Task Plan: TASK-0006 Service Domains And Distributed Hosts

## Goal
Use service-specific hostnames for local Docker/service communication, make service addresses environment-variable driven with `infiniteai.space` as the default domain, and document/configure the requirements for running each containerized service on a separate host.

## Steps
1. Read current Compose, gateway, web API defaults, and README run instructions.
2. Add task context pack before code edits.
3. Add `DOMAIN_NAME` and service host variables with `infiniteai.space` defaults.
4. Update Compose environment URLs and network aliases to derive from those variables.
5. Update gateway and web defaults to derive URLs from domain/host variables while preserving explicit URL overrides.
6. Inventory all service-to-service and browser-to-service communication.
7. Add configurable cookie SameSite behavior required for cross-site web/API deployments.
8. Document required local host mappings, distributed-host runtime variables, Docker Hub build commands, and network/security requirements.
9. Add gateway tests for cookie and derived-domain deployment settings.
10. Run Compose config, gateway tests, and frontend verification.
11. Add AI change record.

## Test Plan
- `docker compose config`
- `python3 -m pytest services/api-gateway/tests`
- `cd web && npm test -- --run`
- `cd web && npm run build`

## Rollback Plan
Revert the hostname/env/default URL/docs/cookie setting changes. No data or schema rollback is required.
