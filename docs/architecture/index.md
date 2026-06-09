# Architecture Index

This directory contains durable architecture documentation.

## Architecture documents

- `ai/context/subsystem-web.md`: React/Vite UI, route protection, Start Ritual, Stop Ritual, foldable rail.
- `ai/context/subsystem-api-gateway.md`: public `/api` contract, cookie handling, upstream proxying.
- `ai/context/subsystem-identity.md`: users, preferences, password auth, JWTs, refresh sessions.
- `ai/context/subsystem-checkpoint.md`: missions, checkpoints, domains, parking items, Today composition.

## Runtime topology

Checkpoint runs locally through Docker Compose:

- `web` serves the React app on port 5173.
- `api-gateway` exposes the public API on port 8000.
- `identity-service` runs internally on port 8001.
- `checkpoint-service` runs internally on port 8002.
- `postgres` stores users, preferences, missions, checkpoints, domains, and parking items.
- `redis` stores refresh-session state.

The browser talks only to `web` and `api-gateway`. The gateway validates auth cookies and forwards user-scoped requests to internal services.

## How to update

Update architecture docs when:

- module boundaries change;
- dependencies change;
- public protocols change;
- persistence or migration models change;
- security or concurrency assumptions change.
