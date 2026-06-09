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

Open `http://localhost:5173`.

The public API is exposed at `http://localhost:8000/api`.

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
