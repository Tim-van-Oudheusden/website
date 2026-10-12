#!/usr/bin/env bash
# Pull the :latest images the prod pod runs, then replay the pod ONLY when at
# least one image's digest actually changed.
#
# podman auto-update re-pulls images but does NOT re-apply Kube YAML, so we pull
# explicitly. On the common no-new-image cycle podman reports "Image is up to
# date" and the digest is unchanged, so we skip the restart — avoiding the
# gratuitous pod teardown/recreate (and its ~12 brief origin outages/hour) that
# restarting podman-kube@website every 5 minutes caused.
#
# This timer runs unattended every 5 minutes with no human in the loop, so a
# replay that leaves the pod broken needs its own safety net (#805): before
# pulling, the currently-running image is tagged locally as a rollback
# reference; after a replay, both containers' /health endpoints are polled,
# and a failure re-tags the rollback image(s) onto :latest, replays again,
# and exits non-zero so the failure shows up in `systemctl --user status` /
# the journal (there's no alerting backend for this site).
#
# The image refs below must match deploy/kube/prod.yaml exactly.
set -euo pipefail

# .Digest is the registry manifest digest for a pulled image; it advances when a
# new image is pushed to the tag and stays the same when the pull is a no-op.
digest() {
  podman image inspect --format '{{.Digest}}' "$1" 2>/dev/null || true
}

# Polls a loopback /health endpoint, retrying for up to ~20s so a slow-starting
# container isn't mistaken for a broken one.
wait_healthy() {
  local url="$1"
  local attempt
  for attempt in $(seq 1 10); do
    if curl -fsS -o /dev/null "$url"; then
      return 0
    fi
    sleep 2
  done
  return 1
}

changed=0
front_changed=0
back_changed=0

front_before="$(digest ghcr.io/tim-van-oudheusden/website/front-end:latest)"
if [[ -n "$front_before" ]]; then
  podman tag ghcr.io/tim-van-oudheusden/website/front-end:latest ghcr.io/tim-van-oudheusden/website/front-end:rollback
fi
podman pull ghcr.io/tim-van-oudheusden/website/front-end:latest
front_after="$(digest ghcr.io/tim-van-oudheusden/website/front-end:latest)"
if [[ -n "$front_after" && "$front_before" != "$front_after" ]]; then
  echo "image changed: front-end:latest"
  changed=1
  front_changed=1
fi

back_before="$(digest ghcr.io/tim-van-oudheusden/website/back-end:latest)"
if [[ -n "$back_before" ]]; then
  podman tag ghcr.io/tim-van-oudheusden/website/back-end:latest ghcr.io/tim-van-oudheusden/website/back-end:rollback
fi
podman pull ghcr.io/tim-van-oudheusden/website/back-end:latest
back_after="$(digest ghcr.io/tim-van-oudheusden/website/back-end:latest)"
if [[ -n "$back_after" && "$back_before" != "$back_after" ]]; then
  echo "image changed: back-end:latest"
  changed=1
  back_changed=1
fi

if [[ "$changed" -eq 0 ]]; then
  echo "images unchanged; skipping pod restart"
  exit 0
fi

echo "replaying podman-kube@website.service"
systemctl --user restart podman-kube@website.service

if wait_healthy http://127.0.0.1:8300/health && wait_healthy http://127.0.0.1:8301/health; then
  echo "update healthy: front-end and back-end both answered /health"
  exit 0
fi

echo "update FAILED health check: rolling back to the previously running image(s)" >&2

if [[ "$front_changed" -eq 1 && -n "$front_before" ]]; then
  podman tag ghcr.io/tim-van-oudheusden/website/front-end:rollback ghcr.io/tim-van-oudheusden/website/front-end:latest
fi
if [[ "$back_changed" -eq 1 && -n "$back_before" ]]; then
  podman tag ghcr.io/tim-van-oudheusden/website/back-end:rollback ghcr.io/tim-van-oudheusden/website/back-end:latest
fi

echo "replaying podman-kube@website.service with rolled-back image(s)" >&2
systemctl --user restart podman-kube@website.service

exit 1
