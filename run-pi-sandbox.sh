#!/usr/bin/env bash
# Run pi inside a Podman container for full filesystem isolation.
#
# Usage:
#   ./run-pi-sandbox.sh              # Run pi interactively
#   ./run-pi-sandbox.sh build        # Build (or rebuild) the sandbox image
#   ./run-pi-sandbox.sh rebuild      # Force rebuild without cache
#   ./run-pi-sandbox.sh --continue   # Continue last session
#   ./run-pi-sandbox.sh --name "X"   # Named session
#   ./run-pi-sandbox.sh -p "prompt"  # One-shot (print mode)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IMAGE_NAME="pi-sandbox"
PROJECT_DIR="$SCRIPT_DIR"
SANDBOX_STATE_DIR="$PROJECT_DIR/.pi-sandbox"
PI_DIR="$SANDBOX_STATE_DIR/agent"
BUN_CACHE="$SANDBOX_STATE_DIR/bun-cache"
HOST_PI_DIR="$HOME/.pi/agent"

# --- Sync host pi config into sandbox ---
sync_pi_config() {
  local file
  for file in settings.json models.json auth.json; do
    if [[ -f "$HOST_PI_DIR/$file" ]]; then
      cp "$HOST_PI_DIR/$file" "$PI_DIR/$file"
    fi
  done

  if [[ -f "$PI_DIR/auth.json" ]]; then
    chmod 600 "$PI_DIR/auth.json"
  fi
}

# --- Build the image ---
do_build() {
  local cache_flag=""
  if [[ "${1:-}" == "--no-cache" ]]; then
    cache_flag="--no-cache"
  fi

  echo "Building $IMAGE_NAME ..."
  podman build $cache_flag \
    -t "$IMAGE_NAME" \
    -f "$PROJECT_DIR/Dockerfile.sandbox" \
    "$PROJECT_DIR"
  echo "Done."
}

# --- Run pi ---
do_run() {
  # Ensure image exists
  if ! podman image exists "$IMAGE_NAME" 2>/dev/null; then
    echo "Image $IMAGE_NAME not found. Building first..."
    do_build
  fi

  mkdir -p "$PI_DIR/sessions" "$BUN_CACHE"
  sync_pi_config

  local tty_args=(-i)
  if [[ -t 0 && -t 1 ]]; then
    tty_args=(-it)
  fi

  # Build podman args
  PODMAN_ARGS=(
    run "${tty_args[@]}" --rm
    --userns=keep-id
    -v "$PROJECT_DIR:/workspace:rw,Z"
    -v "$SANDBOX_STATE_DIR:/workspace/.pi-sandbox:rw,Z"
    -v "$BUN_CACHE:/home/bun/.cache/bun:rw,Z"
    -w /workspace
    -e HOME=/home/bun
    -e PI_CODING_AGENT_DIR=/workspace/.pi-sandbox/agent
    -e PI_CODING_AGENT_SESSION_DIR=/workspace/.pi-sandbox/agent/sessions
    -e TERM="${TERM:-xterm-256color}"
    -e COLORTERM="${COLORTERM:-truecolor}"
    --hostname pi-sandbox
    "$IMAGE_NAME"
    bun
    /home/bun/.bun/bin/pi
  )

  # Pass through any extra args as pi flags
  if [[ $# -gt 0 ]]; then
    PODMAN_ARGS+=("$@")
  fi

  echo "Starting pi in Podman sandbox..."
  exec podman "${PODMAN_ARGS[@]}"
}

# --- Dispatch ---
case "${1:-}" in
  build)
    do_build
    ;;
  rebuild)
    do_build --no-cache
    ;;
  "")
    do_run
    ;;
  *)
    do_run "$@"
    ;;
esac
