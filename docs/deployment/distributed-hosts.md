# Distributed Host Deployment

This note captures what must be true to run each existing service container on a separate host. It does not change the deployment model: each service still runs from its own Dockerfile.

## Images

Build one image per service from the repository root:

```bash
scripts/docker_images.sh build <dockerhub-user> <tag>
```

Push the images:

```bash
scripts/docker_images.sh push <dockerhub-user> <tag>
```

Or build and push in one command:

```bash
scripts/docker_images.sh build-push <dockerhub-user> <tag>
```

The script tags these images:

```text
<dockerhub-user>/checkpoint-web:<tag>
<dockerhub-user>/checkpoint-api-gateway:<tag>
<dockerhub-user>/checkpoint-identity-service:<tag>
<dockerhub-user>/checkpoint-service:<tag>
```

For a specific deployment CPU architecture, set `DOCKER_PLATFORM`:

```bash
DOCKER_PLATFORM=linux/amd64 scripts/docker_images.sh build-push <dockerhub-user> <tag>
```

## Communication Map

| From | To | Configuration | Notes |
|---|---|---|---|
| Browser | Web | Web host URL | Serves the Vite app. |
| Browser | API gateway | `VITE_API_BASE_URL` | Must be the public API gateway origin, for example `https://api.example.com`. |
| API gateway | Identity service | `IDENTITY_SERVICE_URL` | Must be reachable from the gateway host. |
| API gateway | Checkpoint service | `CHECKPOINT_SERVICE_URL` | Must be reachable from the gateway host. Gateway forwards `X-User-Id`. |
| Identity service | Postgres | `DATABASE_URL` | Shared application database. |
| Identity service | Redis | `REDIS_URL` | Stores refresh sessions. |
| Checkpoint service | Postgres | `DATABASE_URL` | Same database or a compatible managed Postgres endpoint. |

The browser should not call identity-service or checkpoint-service directly. It should call only the API gateway.

## Domain Defaults

Local defaults are derived from:

```text
DOMAIN_NAME=infiniteai.space
WEB_HOST=infiniteai.space
API_HOST=api.infiniteai.space
IDENTITY_HOST=identity.infiniteai.space
CHECKPOINT_HOST=checkpoint-service.infiniteai.space
```

For local `/etc/hosts` testing, map these names to `127.0.0.1`. For real distributed hosts, point public DNS for `WEB_HOST` and `API_HOST` at their deployed hosts, and keep `IDENTITY_HOST` and `CHECKPOINT_HOST` private or firewall-restricted to the API gateway.

## Required Runtime Settings

### Web

- `VITE_DOMAIN_NAME`: default domain used when `VITE_API_BASE_URL` is omitted.
- `VITE_API_BASE_URL`: externally reachable API gateway origin.

The current web container runs the Vite server, so `VITE_API_BASE_URL` is read when the container starts. If the web image is later changed to serve prebuilt static assets, that value will need to be set at build time or moved to a runtime config file.

### API Gateway

- `DOMAIN_NAME`: default domain used to derive service hosts.
- `WEB_HOST`: default frontend host used when `FRONTEND_ORIGIN` is omitted.
- `IDENTITY_HOST`: default identity host used when `IDENTITY_SERVICE_URL` is omitted.
- `CHECKPOINT_HOST`: default checkpoint host used when `CHECKPOINT_SERVICE_URL` is omitted.
- `IDENTITY_SERVICE_URL`: identity service URL reachable from the gateway host.
- `CHECKPOINT_SERVICE_URL`: checkpoint service URL reachable from the gateway host.
- `FRONTEND_ORIGIN`: exact web origin allowed by CORS.
- `JWT_SECRET`: same value used by identity-service.
- `COOKIE_SECURE`: `true` in HTTPS production.
- `COOKIE_SAMESITE`: use `lax` when web and API are same-site; use `none` when web and API are cross-site.

For cross-site deployments such as `https://web.example.net` calling `https://api.example.com`, set:

```text
COOKIE_SECURE=true
COOKIE_SAMESITE=none
FRONTEND_ORIGIN=https://web.example.net
```

`COOKIE_SAMESITE=none` is rejected unless `COOKIE_SECURE=true`.

### Identity Service

- `DATABASE_URL`: reachable Postgres URL.
- `REDIS_URL`: reachable Redis URL.
- `JWT_SECRET`: same value used by api-gateway.
- `ACCESS_TOKEN_SECONDS`: optional access token lifetime.
- `REFRESH_TOKEN_SECONDS`: optional refresh session lifetime.

### Checkpoint Service

- `DATABASE_URL`: reachable Postgres URL.

## Network Requirements

- Public internet exposure should be limited to web and api-gateway.
- Identity-service and checkpoint-service trust internal gateway traffic. They should be private-network only or firewall-restricted to the api-gateway host.
- Postgres and Redis should be private-network only or managed services with restricted inbound rules.
- Use HTTPS for the public web and API hosts in production.
- Configure DNS so public users resolve the web host and API gateway host, and the API gateway host can resolve service URLs.

## Current Constraints

- There is no service-to-service authentication between api-gateway and the internal services. Network isolation is therefore required before exposing identity-service or checkpoint-service beyond a trusted private network.
- The web image currently uses the Vite development server. It can still run in a container, but a production web deployment should eventually serve the built static assets from a production HTTP server.
- Database tables are created at service startup with SQLAlchemy metadata. There is no production migration workflow yet.

## Rollback

To roll back distributed deployment configuration, point:

- `VITE_API_BASE_URL` back to the local API gateway.
- `FRONTEND_ORIGIN` back to the local web origin.
- `IDENTITY_SERVICE_URL` and `CHECKPOINT_SERVICE_URL` back to local Docker network names or aliases.
- `COOKIE_SECURE=false` and `COOKIE_SAMESITE=lax` for local HTTP development.
