#!/usr/bin/env bash
# Build the PRODUCTION front-end image, serve it, and require every file under
# public/ to come back byte-identical. The dev pod bind-mounts ./public, so the
# e2e suite cannot see a prod image that ships without it (#480): `serve -s`
# answers a missing file with index.html and a 200.
#
# Requires a podman-capable host (see docs/testing.md); CI runs it in the
# `prod-assets` job.
#
# Tunables:
#   PROD_ASSETS_PORT           loopback port to publish the image on (default 18300)
#   PROD_ASSETS_WAIT_ATTEMPTS  readiness polls before giving up (default 30)
#   PROD_ASSETS_WAIT_INTERVAL  seconds between polls (default 1)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PORT="${PROD_ASSETS_PORT:-18300}"
WAIT_ATTEMPTS="${PROD_ASSETS_WAIT_ATTEMPTS:-30}"
WAIT_INTERVAL="${PROD_ASSETS_WAIT_INTERVAL:-1}"
IMAGE=localhost/website/front-end:prod-assets
CONTAINER=website-prod-assets
BASE="http://127.0.0.1:$PORT"

echo "Building prod front-end image…"
podman build -f front-end/Dockerfile --target prod -t "$IMAGE" .

# No --rm: a container that crashes before answering must survive for `podman logs`.
podman run -d --name "$CONTAINER" -p "127.0.0.1:$PORT:3000" "$IMAGE" >/dev/null
trap 'podman rm -f "$CONTAINER" >/dev/null' EXIT

ready=0
for _ in $(seq 1 "$WAIT_ATTEMPTS"); do
  if curl -fs -o /dev/null "$BASE/"; then
    ready=1
    break
  fi
  sleep "$WAIT_INTERVAL"
done
if [ "$ready" -ne 1 ]; then
  echo "front-end did not become ready" >&2
  podman logs "$CONTAINER" || true
  exit 1
fi

# Dotfiles (e.g. public/.gitkeep) are placeholders, not served assets.
body="$(mktemp)"
failed=0
checked=0
while IFS= read -r -d '' file; do
  path="${file#public}"
  checked=$((checked + 1))
  if curl -fsS -o "$body" "$BASE$path" && cmp -s "$file" "$body"; then
    echo "ok   $path"
  else
    echo "FAIL $path (not served byte-identical to $file)" >&2
    failed=1
  fi
done < <(find public -type f -not -name '.*' -print0 | sort -z)
rm -f "$body"

if [ "$checked" -eq 0 ]; then
  echo "no public/ assets found to check" >&2
  exit 1
fi
if [ "$failed" -ne 0 ]; then
  exit 1
fi
echo "all $checked public/ assets served by the prod image"
