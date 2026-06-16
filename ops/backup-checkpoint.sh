#!/usr/bin/env bash
#
# Back up the Checkpoint Postgres database to a timestamped pg_dump file and
# (optionally) upload a copy to Google Drive via rclone.
#
# - pg_dump runs *inside* the postgres container, so no Postgres client is
#   needed on the host.
# - The dump uses the custom format (-Fc): compressed, and restorable with
#   ops/restore-checkpoint.sh.
# - Designed to be cron-safe: all config can live in ops/backup.env so the
#   crontab line stays a single path. Non-zero exit on any failure.
#
# Config: see ops/backup.env.example (copy to ops/backup.env).
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { printf '[backup] %s\n' "$*"; }
die()  { printf '[backup] ERROR: %s\n' "$*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

# --- load config --------------------------------------------------------------
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-$SCRIPT_DIR/backup.env}"
if [[ -f "$BACKUP_ENV_FILE" ]]; then
  log "config: $BACKUP_ENV_FILE"
  # shellcheck disable=SC1090
  set -a; . "$BACKUP_ENV_FILE"; set +a
else
  log "no config file at $BACKUP_ENV_FILE — using defaults / environment"
fi

PROJECT_ROOT="${PROJECT_ROOT:-/home/mohammad/home-projects}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.yaml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-checkpoint-postgres}"
DB_NAME="${DB_NAME:-checkpoint}"
DB_USER="${DB_USER:-checkpoint}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
KEEP_LOCAL="${KEEP_LOCAL:-14}"
SKIP_UPLOAD="${SKIP_UPLOAD:-false}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
RCLONE_CONFIG="${RCLONE_CONFIG:-}"
KEEP_REMOTE_DAYS="${KEEP_REMOTE_DAYS:-}"

require_cmd docker
[[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $COMPOSE_FILE"

dc() { docker compose -f "$COMPOSE_FILE" "$@"; }

# --- dump ---------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/checkpoint-$STAMP.dump"
TMP="$OUT.partial"

# PGPASSWORD only needed if local trust auth is disabled in the container.
PG_ENV=()
[[ -n "${DB_PASSWORD:-}" ]] && PG_ENV=(-e "PGPASSWORD=$DB_PASSWORD")

log "dumping $DB_NAME from service '$POSTGRES_SERVICE' -> $OUT"
if ! dc exec -T "${PG_ENV[@]}" "$POSTGRES_SERVICE" \
      pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$TMP"; then
  rm -f "$TMP"
  die "pg_dump failed (is '$POSTGRES_SERVICE' up? check DB_USER/DB_NAME)"
fi

# Validate the dump is readable before we trust it (catches truncation).
if ! dc exec -T "$POSTGRES_SERVICE" pg_restore -l - < "$TMP" >/dev/null 2>&1; then
  rm -f "$TMP"
  die "dump failed validation (pg_restore -l could not read it)"
fi

mv "$TMP" "$OUT"
SIZE="$(du -h "$OUT" | cut -f1)"
log "wrote $OUT ($SIZE)"

# --- upload to Google Drive ---------------------------------------------------
if [[ "$SKIP_UPLOAD" == "true" || "$SKIP_UPLOAD" == "1" ]]; then
  log "SKIP_UPLOAD set — not uploading to Drive"
else
  [[ -n "$RCLONE_REMOTE" ]] || die "RCLONE_REMOTE is empty (set it or SKIP_UPLOAD=true)"
  require_cmd rclone
  RCLONE_FLAGS=()
  [[ -n "$RCLONE_CONFIG" ]] && RCLONE_FLAGS+=(--config "$RCLONE_CONFIG")
  log "uploading to $RCLONE_REMOTE"
  rclone "${RCLONE_FLAGS[@]}" copy "$OUT" "$RCLONE_REMOTE/" --no-traverse
  if [[ -n "$KEEP_REMOTE_DAYS" ]]; then
    log "pruning remote dumps older than ${KEEP_REMOTE_DAYS}d"
    rclone "${RCLONE_FLAGS[@]}" delete "$RCLONE_REMOTE" \
      --min-age "${KEEP_REMOTE_DAYS}d" --include "checkpoint-*.dump"
  fi
fi

# --- prune local --------------------------------------------------------------
# Keep the KEEP_LOCAL newest dumps; remove the rest.
mapfile -t OLD < <(ls -1t "$BACKUP_DIR"/checkpoint-*.dump 2>/dev/null | tail -n +"$((KEEP_LOCAL + 1))")
if (( ${#OLD[@]} > 0 )); then
  log "pruning ${#OLD[@]} local dump(s) beyond the newest $KEEP_LOCAL"
  rm -f -- "${OLD[@]}"
fi

log "done"
