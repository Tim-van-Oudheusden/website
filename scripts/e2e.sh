#!/usr/bin/env bash
# Run the Playwright E2E suite exactly like the CI `e2e` job
# (.github/workflows/ci.yml): build dev images → kube play the dev pod →
# wait for the services → bun run test:e2e → tear the pod down (always).
#
# Requires a podman-capable host (see docs/testing.md). Prerequisites, as in CI:
#   bun install --frozen-lockfile
#   bunx playwright install --with-deps chromium
#
# Tunables:
#   E2E_WAIT_ATTEMPTS  readiness polls before giving up (default 60, as CI)
#   E2E_WAIT_INTERVAL  seconds between polls (default 5, as CI)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WAIT_ATTEMPTS="${E2E_WAIT_ATTEMPTS:-60}"
WAIT_INTERVAL="${E2E_WAIT_INTERVAL:-5}"

echo "Building dev images…"
podman build -f front-end/Dockerfile --target dev -t localhost/website/front-end:dev .
podman build -f back-end/Dockerfile --target dev -t localhost/website/back-end:dev .

echo "Starting dev pod…"
podman kube play deploy/kube/dev.yaml
trap 'echo "Stopping dev pod…"; podman kube down deploy/kube/dev.yaml' EXIT

echo "Waiting for services…"
ready=0
for _ in $(seq 1 "$WAIT_ATTEMPTS"); do
  if curl -fsS http://localhost:3001/health >/dev/null && curl -fsS http://localhost:5173/ >/dev/null; then
    echo "services ready"
    ready=1
    break
  fi
  sleep "$WAIT_INTERVAL"
done
if [ "$ready" -ne 1 ]; then
  echo "services did not become ready" >&2
  podman pod logs website || true
  exit 1
fi

echo "Running e2e tests…"
bun run test:e2e
