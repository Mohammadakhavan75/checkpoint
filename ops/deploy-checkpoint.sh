#!/usr/bin/env bash
set -Eeuo pipefail

usage() {
  cat <<'USAGE'
Usage:
  deploy-checkpoint.sh <deployment-branch>

Example:
  ./ops/deploy-checkpoint.sh prod/alpha

Environment overrides:
  PROJECT_ROOT     default: /home/mohammad/home-projects
  REPO_DIR         default: $PROJECT_ROOT/checkpoint
  COMPOSE_FILE     default: $PROJECT_ROOT/docker-compose.yaml
  REMOTE           default: origin
  SERVICES         default: "checkpoint-api checkpoint-web"
  HEALTHCHECK_URL  default: https://api.infiniteai.space/api/auth/providers
  SKIP_HEALTHCHECK default: false

This script is intentionally safe by default:
  - refuses to deploy if the repo has local changes
  - refuses non-fast-forward branch updates
  - does not run git reset --hard or git clean
USAGE
}

log() {
  printf '[deploy] %s\n' "$*"
}

die() {
  printf '[deploy] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

BRANCH="${1:-}"
if [[ -z "$BRANCH" || "$BRANCH" == "-h" || "$BRANCH" == "--help" ]]; then
  usage
  [[ -n "$BRANCH" ]] && exit 0
  exit 2
fi

PROJECT_ROOT="${PROJECT_ROOT:-/home/mohammad/home-projects}"
REPO_DIR="${REPO_DIR:-$PROJECT_ROOT/checkpoint}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.yaml}"
REMOTE="${REMOTE:-origin}"
SERVICES="${SERVICES:-checkpoint-api checkpoint-web}"
HEALTHCHECK_URL="${HEALTHCHECK_URL:-https://api.infiniteai.space/api/auth/providers}"
SKIP_HEALTHCHECK="${SKIP_HEALTHCHECK:-false}"

require_cmd git
require_cmd docker
if [[ "$SKIP_HEALTHCHECK" != "true" ]]; then
  require_cmd curl
fi

[[ -d "$REPO_DIR/.git" ]] || die "repo not found: $REPO_DIR"
[[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $COMPOSE_FILE"

read -r -a SERVICE_ARGS <<< "$SERVICES"
[[ "${#SERVICE_ARGS[@]}" -gt 0 ]] || die "SERVICES is empty"

log "repo: $REPO_DIR"
log "branch: $BRANCH"
log "compose: $COMPOSE_FILE"
log "services: ${SERVICE_ARGS[*]}"

cd "$REPO_DIR"

if [[ -n "$(git status --porcelain)" ]]; then
  git status --short >&2
  die "repo has local changes; commit/stash them before deploying"
fi

log "fetching $REMOTE/$BRANCH"
git fetch --prune "$REMOTE" "$BRANCH"

if ! git show-ref --verify --quiet "refs/remotes/$REMOTE/$BRANCH"; then
  die "remote branch not found: $REMOTE/$BRANCH"
fi

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git checkout "$BRANCH"
else
  git checkout -b "$BRANCH" --track "$REMOTE/$BRANCH"
fi

log "fast-forwarding to $REMOTE/$BRANCH"
git merge --ff-only "$REMOTE/$BRANCH"

COMMIT="$(git rev-parse --short=12 HEAD)"
log "deploying commit $COMMIT"

cd "$PROJECT_ROOT"

log "building and starting containers"
docker compose -f "$COMPOSE_FILE" up -d --build "${SERVICE_ARGS[@]}"

log "container status"
docker compose -f "$COMPOSE_FILE" ps checkpoint-postgres "${SERVICE_ARGS[@]}"

if [[ "$SKIP_HEALTHCHECK" != "true" ]]; then
  log "healthcheck: $HEALTHCHECK_URL"
  curl -fsS --retry 10 --retry-delay 3 "$HEALTHCHECK_URL"
  printf '\n'
fi

log "done"
