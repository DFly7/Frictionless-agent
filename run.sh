#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/frontend/ui/.env.local"

# Parse run.sh flags (before passing rest to docker compose)
LOG_CONTEXT_FLAG=0
COMPOSE_ARGS=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --log-context|-l)
      LOG_CONTEXT_FLAG=1
      shift
      ;;
    *)
      COMPOSE_ARGS+=("$1")
      shift
      ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

# Load env vars for the compose build args
set -a
source "$ENV_FILE"
set +a

# Export context logging env vars for gateway (passed to agent containers)
if [ "$LOG_CONTEXT_FLAG" = 1 ]; then
  export LOG_CONTEXT=1
  export LOG_SUB_AGENT_CONTEXT=1
  echo "==> Context logging enabled (LLM context → ~/.nanobot/logs/)"
fi

# 1. Build the nanobot-tutor agent image (needed before gateway can spawn agents)
echo "==> Building nanobot-tutor image..."
docker build -t nanobot-tutor "$SCRIPT_DIR/nanobot-tutor"

# 2. Create data directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/data"

# 3. Build gateway (uses cache; code changes invalidate layers automatically)
echo "==> Building gateway..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" build gateway

# 4. Bring up the stack
echo "==> Starting stack with docker compose..."
if [ ${#COMPOSE_ARGS[@]} -eq 0 ]; then
  docker compose -f "$SCRIPT_DIR/docker-compose.yml" up --build
else
  docker compose -f "$SCRIPT_DIR/docker-compose.yml" up --build "${COMPOSE_ARGS[@]}"
fi
