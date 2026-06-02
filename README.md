# Checkpoint

Checkpoint is a minimalist, ADHD-friendly continuity app: a save system for real life. The MVP opens to a guided Start Ritual so a user can resume meaningful work without reconstructing context from memory.

## Stack

- React + Vite + TypeScript web app
- FastAPI API gateway
- FastAPI identity service
- FastAPI checkpoint service
- Postgres persistence
- Redis-backed refresh sessions
- Docker Compose for local development

## Run

```bash
cp .env.example .env
docker compose up --build
```

Add these host mappings before opening the app:

```text
127.0.0.1 infiniteai.space
127.0.0.1 api.infiniteai.space
127.0.0.1 identity.infiniteai.space
127.0.0.1 checkpoint-service.infiniteai.space
```

Then open `http://infiniteai.space:5173`.

The public API is exposed at `http://api.infiniteai.space:8000/api`.

For deploying each container on a separate host, see [Distributed Host Deployment](docs/deployment/distributed-hosts.md).

## Core Flow

1. Sign up or log in.
2. Create a first mission if Today is empty.
3. Use Today to read the last checkpoint, next physical action, and what not to rethink.
4. Leave a checkpoint when stopping.
5. Return to Today and resume from the checkpoint.

## Useful Commands

```bash
docker compose up --build
docker compose down
docker compose down -v
scripts/docker_images.sh build <dockerhub-user> <tag>
scripts/docker_images.sh build-push <dockerhub-user> <tag>
```

Backend tests:

```bash
cd services/identity-service && pytest
cd services/checkpoint-service && pytest
```

Frontend tests:

```bash
cd web && npm install && npm test
```
