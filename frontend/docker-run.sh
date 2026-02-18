#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UI_DIR="$SCRIPT_DIR/ui"
ENV_FILE="$UI_DIR/.env.local"
IMAGE_NAME="nanobot-ui"
CONTAINER_NAME="nanobot-ui"
PORT="${PORT:-3000}"
DETACH="${DETACH:-false}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Error: $ENV_FILE not found"
  exit 1
fi

source "$ENV_FILE"

echo "==> Building $IMAGE_NAME..."
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -t "$IMAGE_NAME" \
  "$UI_DIR"

# Stop existing container if running
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

RUN_FLAGS="--name $CONTAINER_NAME -p $PORT:3000 --env-file $ENV_FILE"

if [ "$DETACH" = "true" ]; then
  echo "==> Running $CONTAINER_NAME on port $PORT (detached)..."
  docker run -d $RUN_FLAGS "$IMAGE_NAME"
  echo "==> $CONTAINER_NAME is running at http://localhost:$PORT"
else
  echo "==> Running $CONTAINER_NAME on port $PORT..."
  docker run --rm $RUN_FLAGS "$IMAGE_NAME"
fi
