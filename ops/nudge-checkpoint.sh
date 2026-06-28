#!/usr/bin/env bash
#
# Once a day, carry the gift off-app: read the single freshest resume line out
# of Postgres and push it to one channel (chat / OS notification), so a reason
# to return lands in your life even when Checkpoint is closed.
#
# The message IS the resume line — value travels even if you never tap it. This
# is the concierge v0 of docs/product/RETURN_CUE_NUDGE.md: a script + a cron
# line, no app/API/DB change, revert by removing both.
#
# - The SQL runs *inside* the postgres container (like ops/backup-checkpoint.sh),
#   so no Postgres client is needed on the host and no app auth is wired.
# - Read-only: it never writes to the database. The only state it keeps is a
#   small local file (last-sent date + back-off counter).
# - Designed to be cron-safe: all config lives in ops/nudge.env so the crontab
#   line stays a single path.
#
# Guardrails (P0 — these keep it on your side, not a nag):
#   * Carries value, never just "come back".
#   * At most one send per day (hard cap via the state file).
#   * Silent when there's no open thread — no "all caught up!" guilt.
#   * Skips entirely if you already checkpointed today (you're in the loop).
#   * Backs OFF when ignored (daily -> weekly), never escalates.
#   * Never references how long you've been gone.
#
# Config: see ops/nudge.env.example (copy to ops/nudge.env).
set -Eeuo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log()  { printf '[nudge] %s\n' "$*"; }
die()  { printf '[nudge] ERROR: %s\n' "$*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"; }

# --- load config --------------------------------------------------------------
NUDGE_ENV_FILE="${NUDGE_ENV_FILE:-$SCRIPT_DIR/nudge.env}"
if [[ -f "$NUDGE_ENV_FILE" ]]; then
  log "config: $NUDGE_ENV_FILE"
  # shellcheck disable=SC1090
  set -a; . "$NUDGE_ENV_FILE"; set +a
else
  log "no config file at $NUDGE_ENV_FILE — using defaults / environment"
fi

PROJECT_ROOT="${PROJECT_ROOT:-/home/mohammad/home-projects}"
COMPOSE_FILE="${COMPOSE_FILE:-$PROJECT_ROOT/docker-compose.yaml}"
POSTGRES_SERVICE="${POSTGRES_SERVICE:-checkpoint-postgres}"
DB_NAME="${DB_NAME:-checkpoint}"
DB_USER="${DB_USER:-checkpoint}"

# Whose thread to read. Provide exactly one (owner id wins if both are set).
NUDGE_OWNER_ID="${NUDGE_OWNER_ID:-}"
NUDGE_EMAIL="${NUDGE_EMAIL:-}"

# Presentation.
NUDGE_NAME="${NUDGE_NAME:-you}"
NUDGE_APP_URL="${NUDGE_APP_URL:-https://checkpoint.example.com}"
NUDGE_TZ="${NUDGE_TZ:-UTC}"

# Channel: stdout | telegram | webhook | osascript. See nudge.env.example.
NUDGE_CHANNEL="${NUDGE_CHANNEL:-stdout}"
NUDGE_DRY_RUN="${NUDGE_DRY_RUN:-false}"
NUDGE_WEBHOOK_URL="${NUDGE_WEBHOOK_URL:-}"
NUDGE_WEBHOOK_JSON_KEY="${NUDGE_WEBHOOK_JSON_KEY:-text}"   # discord uses "content"
NUDGE_TELEGRAM_TOKEN="${NUDGE_TELEGRAM_TOKEN:-}"
NUDGE_TELEGRAM_CHAT_ID="${NUDGE_TELEGRAM_CHAT_ID:-}"

# Back-off: after this many consecutive un-returned nudges, drop from daily to
# one nudge every BACKOFF_INTERVAL_DAYS. Never escalates.
NUDGE_BACKOFF_AFTER="${NUDGE_BACKOFF_AFTER:-3}"
NUDGE_BACKOFF_INTERVAL_DAYS="${NUDGE_BACKOFF_INTERVAL_DAYS:-7}"

NUDGE_STATE_FILE="${NUDGE_STATE_FILE:-$SCRIPT_DIR/.nudge-state}"

require_cmd docker
[[ -f "$COMPOSE_FILE" ]] || die "compose file not found: $COMPOSE_FILE"

# --- owner filter (validated, no string interpolation of user input into SQL) -
# Both forms below resolve to a constant we control: a UUID literal we sanity-
# check, or a parameterized-by-shape email subquery. Reject anything weird.
if [[ -n "$NUDGE_OWNER_ID" ]]; then
  [[ "$NUDGE_OWNER_ID" =~ ^[0-9a-fA-F-]{36}$ ]] || die "NUDGE_OWNER_ID is not a UUID"
  OWNER_SQL="i.owner_id = '$NUDGE_OWNER_ID'"
elif [[ -n "$NUDGE_EMAIL" ]]; then
  [[ "$NUDGE_EMAIL" =~ ^[^\'\"[:space:]]+@[^\'\"[:space:]]+$ ]] || die "NUDGE_EMAIL looks invalid"
  OWNER_SQL="i.owner_id = (SELECT id FROM users WHERE email = '$NUDGE_EMAIL')"
else
  die "set NUDGE_OWNER_ID or NUDGE_EMAIL in $NUDGE_ENV_FILE"
fi

# --- psql plumbing ------------------------------------------------------------
PG_ENV=()
[[ -n "${DB_PASSWORD:-}" ]] && PG_ENV=(-e "PGPASSWORD=$DB_PASSWORD")

# Run a query, tuples-only/unaligned, tab-separated. stdin SQL.
psql_q() {
  docker compose -f "$COMPOSE_FILE" exec -T "${PG_ENV[@]}" "$POSTGRES_SERVICE" \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -tA -F $'\t' -q
}

# Local-zone "today" and any prior date math, all done in the configured tz.
TODAY="$(TZ="$NUDGE_TZ" date +%F)"

# --- state (last-sent date + back-off counter) --------------------------------
LAST_SENT_DATE=""
CONSECUTIVE_UNRETURNED=0
if [[ -f "$NUDGE_STATE_FILE" ]]; then
  # shellcheck disable=SC1090
  . "$NUDGE_STATE_FILE"
fi

save_state() {
  printf 'LAST_SENT_DATE=%s\nCONSECUTIVE_UNRETURNED=%s\n' \
    "$1" "$2" > "$NUDGE_STATE_FILE"
}

# --- one-per-day hard cap -----------------------------------------------------
if [[ "$LAST_SENT_DATE" == "$TODAY" ]]; then
  log "already nudged today ($TODAY) — nothing to do"
  exit 0
fi

# --- count checkpoints with local date strictly after a given date ------------
count_returns_since() {  # $1 = YYYY-MM-DD
  printf "%s\n" "SELECT count(*) FROM checkpoints c JOIN items i ON i.id = c.item_id
    WHERE $OWNER_SQL
      AND (c.created_at AT TIME ZONE '$NUDGE_TZ')::date > '$1'::date;" \
    | psql_q | tr -d '[:space:]'
}

# Already in the loop? If you checkpointed today, stay silent and reset back-off.
RETURNED_TODAY="$(count_returns_since "$(TZ="$NUDGE_TZ" date -d "$TODAY -1 day" +%F 2>/dev/null \
  || date -v-1d -j -f %F "$TODAY" +%F)")"
if [[ "${RETURNED_TODAY:-0}" -gt 0 ]]; then
  log "you already checkpointed today — in the loop, no nudge"
  save_state "$LAST_SENT_DATE" 0
  exit 0
fi

# Reset the back-off counter if you returned at all since the last nudge.
if [[ -n "$LAST_SENT_DATE" ]]; then
  RETURNED_SINCE="$(count_returns_since "$LAST_SENT_DATE")"
  if [[ "${RETURNED_SINCE:-0}" -gt 0 ]]; then
    CONSECUTIVE_UNRETURNED=0
  fi
fi

# --- back-off gate: daily -> every N days once ignored repeatedly -------------
if [[ "$CONSECUTIVE_UNRETURNED" -ge "$NUDGE_BACKOFF_AFTER" && -n "$LAST_SENT_DATE" ]]; then
  last_epoch="$(date -d "$LAST_SENT_DATE" +%s 2>/dev/null || date -j -f %F "$LAST_SENT_DATE" +%s)"
  today_epoch="$(date -d "$TODAY" +%s 2>/dev/null || date -j -f %F "$TODAY" +%s)"
  days_since=$(( (today_epoch - last_epoch) / 86400 ))
  if [[ "$days_since" -lt "$NUDGE_BACKOFF_INTERVAL_DAYS" ]]; then
    log "backed off ($CONSECUTIVE_UNRETURNED ignored); next nudge in $(( NUDGE_BACKOFF_INTERVAL_DAYS - days_since ))d"
    exit 0
  fi
fi

# --- read the one loaded move -------------------------------------------------
ROW="$(printf "%s\n" "SELECT i.title, c.resume_from, c.next_action
  FROM checkpoints c JOIN items i ON i.id = c.item_id
  WHERE $OWNER_SQL
    AND i.is_tutorial = false
    AND i.state <> 'done'
    AND i.deleted_at IS NULL
  ORDER BY c.created_at DESC
  LIMIT 1;" | psql_q)"

# Silence when empty: no open thread -> send nothing, no guilt.
if [[ -z "${ROW//[[:space:]]/}" ]]; then
  log "no open thread — staying silent"
  exit 0
fi

IFS=$'\t' read -r TITLE RESUME_FROM NEXT_ACTION <<<"$ROW"

# --- format the gift (carry value, never demand; no time-shaming) -------------
MSG="$(cat <<EOF
Dear future ${NUDGE_NAME} — here's where you left off, only if you feel up to it.
${TITLE} → pick up from: ${RESUME_FROM:-—}
first move: ${NEXT_ACTION:-—}
${NUDGE_APP_URL}
EOF
)"

# --- send ---------------------------------------------------------------------
json_escape() {  # minimal JSON string escaping (backslash, quote, newline, tab)
  local s="$1"
  s="${s//\\/\\\\}"; s="${s//\"/\\\"}"; s="${s//$'\n'/\\n}"; s="${s//$'\t'/\\t}"
  printf '%s' "$s"
}

send() {
  local msg="$1"
  if [[ "$NUDGE_DRY_RUN" == "true" || "$NUDGE_DRY_RUN" == "1" ]]; then
    log "DRY RUN — would send via '$NUDGE_CHANNEL':"
    printf '%s\n' "$msg"
    return 0
  fi
  case "$NUDGE_CHANNEL" in
    stdout)
      printf '%s\n' "$msg"
      ;;
    telegram)
      require_cmd curl
      [[ -n "$NUDGE_TELEGRAM_TOKEN" && -n "$NUDGE_TELEGRAM_CHAT_ID" ]] \
        || die "telegram channel needs NUDGE_TELEGRAM_TOKEN + NUDGE_TELEGRAM_CHAT_ID"
      curl -fsS --max-time 20 \
        "https://api.telegram.org/bot${NUDGE_TELEGRAM_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${NUDGE_TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=${msg}" \
        --data-urlencode "disable_web_page_preview=true" >/dev/null \
        || die "telegram send failed"
      ;;
    webhook)
      require_cmd curl
      [[ -n "$NUDGE_WEBHOOK_URL" ]] || die "webhook channel needs NUDGE_WEBHOOK_URL"
      curl -fsS --max-time 20 -X POST -H 'Content-Type: application/json' \
        -d "{\"${NUDGE_WEBHOOK_JSON_KEY}\": \"$(json_escape "$msg")\"}" \
        "$NUDGE_WEBHOOK_URL" >/dev/null \
        || die "webhook send failed"
      ;;
    osascript)
      require_cmd osascript
      # One-line notification: collapse newlines for the OS banner.
      osascript -e "display notification \"$(json_escape "${msg//$'\n'/ · }")\" with title \"Checkpoint\""
      ;;
    *)
      die "unknown NUDGE_CHANNEL: $NUDGE_CHANNEL"
      ;;
  esac
}

log "nudging via '$NUDGE_CHANNEL': $TITLE"
send "$MSG"

# Record the send (and tick the back-off counter; reset above when you return).
save_state "$TODAY" "$(( CONSECUTIVE_UNRETURNED + 1 ))"
log "done"
