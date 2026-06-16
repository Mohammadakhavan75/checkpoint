#!/usr/bin/env bash
#
# Restore the Checkpoint Postgres database from a pg_dump file produced by
# ops/backup-checkpoint.sh. THIS OVERWRITES THE CURRENT DATABASE.
#
# Usage:
#   restore-checkpoint.sh --list                 # list local + Drive backups
#   restore-checkpoint.sh --latest               # restore newest local dump
#   restore-checkpoint.sh --file <path>          # restore a specific local dump
#   restore-checkpoint.sh --from-drive <name>    # pull from Drive, then restore
#
# Options:
#   --yes        skip the interactive confirmation (for scripted recovery)
#
# Config: shared with backup-checkpoint.sh — see ops/backup.env.example.
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { printf '[restore] %s\n' "$*"; }
die()  { printf '[restore] ERROR: %s\n' "$*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

# --- load config --------------------------------------------------------------
BACKUP_ENV_FILE="${BACKUP_ENV_FILE:-$SCRIPT_DIR/backup.env}"
if [[ -f "$BACKUP_ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a; . "$BACKUP_ENV_FILE"; set +a
fi

PROJECT_ROOT="${PROJECT_ROOT:-/home/mohammad/home-projects}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.yaml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-checkpoint-postgres}"
API_SERVICE="${API_SERVICE:-checkpoint-api}"
DB_NAME="${DB_NAME:-checkpoint}"
DB_USER="${DB_USER:-checkpoint}"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RCLONE_REMOTE="${RCLONE_REMOTE:-}"
RCLONE_CONFIG="${RCLONE_CONFIG:-}"

# --- args ---------------------------------------------------------------------
MODE=""; ARG=""; ASSUME_YES=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)        MODE="list" ;;
    --latest)      MODE="latest" ;;
    --file)        MODE="file"; ARG="${2:-}"; shift ;;
    --from-drive)  MODE="drive"; ARG="${2:-}"; shift ;;
    --yes|-y)      ASSUME_YES=true ;;
    -h|--help)     awk 'NR>1{if(/^#/){sub(/^# ?/,"");print}else exit}' "${BASH_SOURCE[0]}"; exit 0 ;;
    *)             die "unknown argument: $1 (try --help)" ;;
  esac
  shift
done
[[ -n "$MODE" ]] || die "nothing to do — pass --list, --latest, --file or --from-drive (try --help)"

require_cmd docker
[[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $COMPOSE_FILE"
dc() { docker compose -f "$COMPOSE_FILE" "$@"; }

rclone_cli() {
  require_cmd rclone
  local flags=()
  [[ -n "$RCLONE_CONFIG" ]] && flags+=(--config "$RCLONE_CONFIG")
  rclone "${flags[@]}" "$@"
}

# --- list ---------------------------------------------------------------------
if [[ "$MODE" == "list" ]]; then
  log "local dumps in $BACKUP_DIR:"
  ls -1t "$BACKUP_DIR"/checkpoint-*.dump 2>/dev/null || echo "  (none)"
  if [[ -n "$RCLONE_REMOTE" ]]; then
    log "Drive dumps in $RCLONE_REMOTE:"
    rclone_cli lsf "$RCLONE_REMOTE" --include "checkpoint-*.dump" 2>/dev/null | sort -r || echo "  (none / unreachable)"
  fi
  exit 0
fi

# --- resolve the dump file ----------------------------------------------------
FILE=""
case "$MODE" in
  latest)
    FILE="$(ls -1t "$BACKUP_DIR"/checkpoint-*.dump 2>/dev/null | head -1 || true)"
    [[ -n "$FILE" ]] || die "no local dumps found in $BACKUP_DIR"
    ;;
  file)
    FILE="$ARG"
    [[ -n "$FILE" ]] || die "--file needs a path"
    ;;
  drive)
    [[ -n "$ARG" ]] || die "--from-drive needs a filename (see --list)"
    [[ -n "$RCLONE_REMOTE" ]] || die "RCLONE_REMOTE is empty"
    mkdir -p "$BACKUP_DIR"
    log "pulling $ARG from $RCLONE_REMOTE"
    rclone_cli copy "$RCLONE_REMOTE/$ARG" "$BACKUP_DIR/" --no-traverse
    FILE="$BACKUP_DIR/$ARG"
    ;;
esac
[[ -f "$FILE" ]] || die "dump not found: $FILE"

# Validate before we touch the live database.
if ! dc exec -T "$POSTGRES_SERVICE" pg_restore -l - < "$FILE" >/dev/null 2>&1; then
  die "dump failed validation (pg_restore -l could not read $FILE)"
fi

# --- confirm (destructive) ----------------------------------------------------
log "about to OVERWRITE database '$DB_NAME' on service '$POSTGRES_SERVICE'"
log "source dump: $FILE"
if [[ "$ASSUME_YES" != "true" ]]; then
  printf '[restore] type the database name (%s) to confirm: ' "$DB_NAME"
  read -r CONFIRM
  [[ "$CONFIRM" == "$DB_NAME" ]] || die "confirmation did not match — aborting"
fi

PG_ENV=()
[[ -n "${DB_PASSWORD:-}" ]] && PG_ENV=(-e "PGPASSWORD=$DB_PASSWORD")

# Stop the API first so nothing writes mid-restore. Best-effort: if the service
# name differs locally this just no-ops with a warning.
log "stopping $API_SERVICE"
dc stop "$API_SERVICE" 2>/dev/null || log "could not stop $API_SERVICE (continuing)"

log "restoring (drop + recreate objects, then load data)"
# --clean --if-exists drops existing objects first; --no-owner/--no-privileges
# keep ownership tied to the restoring role regardless of the dump's origin.
dc exec -T "${PG_ENV[@]}" "$POSTGRES_SERVICE" \
  pg_restore --clean --if-exists --no-owner --no-privileges \
  -U "$DB_USER" -d "$DB_NAME" < "$FILE"

log "starting $API_SERVICE"
dc start "$API_SERVICE" 2>/dev/null || log "could not start $API_SERVICE — start it manually"

log "done — restored '$DB_NAME' from $(basename "$FILE")"
