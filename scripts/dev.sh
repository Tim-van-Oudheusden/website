#!/usr/bin/env bash
# Local dev: build the dev images and deploy the kube-play dev pod.
#
# Usage:
#   scripts/dev.sh        # build + deploy + follow pod logs (Ctrl-C to stop)
#   scripts/dev-down.sh   # tear the dev pod down
#
# The dev pod (deploy/kube/dev.yaml) publishes:
#   front-end  http://localhost:5173  (Vite dev server, HMR)
#   back-end   http://localhost:3001  (Fastify, /health at root)
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "Building dev images…"
podman build -f front-end/Dockerfile --target dev -t localhost/website/front-end:dev .
podman build -f back-end/Dockerfile --target dev -t localhost/website/back-end:dev .

echo "Deploying dev pod…"
podman kube play deploy/kube/dev.yaml

echo "Following pod logs (Ctrl-C to stop following; run scripts/dev-down.sh to tear down)…"
podman pod logs -f website