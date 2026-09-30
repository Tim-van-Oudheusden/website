#!/usr/bin/env bash
# Tear down the local kube-play dev pod started by scripts/dev.sh.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

podman kube down deploy/kube/dev.yaml