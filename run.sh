#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/frontend/ui/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

# Load env vars for the compose build args
set -a
source "$ENV_FILE"
set +a

# 1. Build the nanobot-tutor agent image (needed before gateway can spawn agents)
echo "==> Building nanobot-tutor image..."
docker build -t nanobot-tutor "$SCRIPT_DIR/nanobot-tutor"

# 2. Create data directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/data"

# 3. Build gateway without cache (ensures code changes are picked up)
echo "==> Building gateway (no cache)..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" build --no-cache gateway

# 4. Bring up the stack
echo "==> Starting stack with docker compose..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up --build "$@"
