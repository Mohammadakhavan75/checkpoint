#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 TASK-ID short-name"
  echo "Example: $0 TASK-0001 refresh-token-race"
  exit 1
fi

TASK_ID="$1"
SHORT_NAME="$2"
TASK_SLUG="${TASK_ID}-${SHORT_NAME}"
TASK_DIR="ai/tasks/${TASK_SLUG}"
CONTEXT_PACK="ai/context-packs/${TASK_SLUG}.md"
PLAN_FILE="${TASK_DIR}/plan.md"
SESSION_LOG="${TASK_DIR}/session-log.md"

mkdir -p "$TASK_DIR"

if [ ! -f "$CONTEXT_PACK" ]; then
  cp ai/templates/context-pack-template.md "$CONTEXT_PACK"
  sed -i.bak "s/<TASK-ID>/${TASK_ID}/g; s/<Task Name>/${SHORT_NAME}/g" "$CONTEXT_PACK" && rm -f "${CONTEXT_PACK}.bak"
fi

if [ ! -f "$PLAN_FILE" ]; then
  cp ai/templates/plan-template.md "$PLAN_FILE"
  sed -i.bak "s/<TASK-ID>/${TASK_ID}/g; s/<Task Name>/${SHORT_NAME}/g" "$PLAN_FILE" && rm -f "${PLAN_FILE}.bak"
fi

if [ ! -f "$SESSION_LOG" ]; then
  cp ai/templates/session-log-template.md "$SESSION_LOG"
  sed -i.bak "s/<TASK-ID>/${TASK_ID}/g; s/<Task Name>/${SHORT_NAME}/g" "$SESSION_LOG" && rm -f "${SESSION_LOG}.bak"
fi

cat <<OUT
Created or verified task workspace:
- ${CONTEXT_PACK}
- ${PLAN_FILE}
- ${SESSION_LOG}

Next agent instruction:
Follow AGENTS.md. Complete the context pack and plan before editing code.
OUT
