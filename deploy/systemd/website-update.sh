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
# The image refs below must match deploy/kube/prod.yaml exactly.
set -euo pipefail

# .Digest is the registry manifest digest for a pulled image; it advances when a
# new image is pushed to the tag and stays the same when the pull is a no-op.
digest() {
  podman image inspect --format '{{.Digest}}' "$1" 2>/dev/null || true
}

changed=0

front_before="$(digest ghcr.io/tim-van-oudheusden/website/front-end:latest)"
podman pull ghcr.io/tim-van-oudheusden/website/front-end:latest
front_after="$(digest ghcr.io/tim-van-oudheusden/website/front-end:latest)"
if [[ -n "$front_after" && "$front_before" != "$front_after" ]]; then
  echo "image changed: front-end:latest"
  changed=1
fi

back_before="$(digest ghcr.io/tim-van-oudheusden/website/back-end:latest)"
podman pull ghcr.io/tim-van-oudheusden/website/back-end:latest
back_after="$(digest ghcr.io/tim-van-oudheusden/website/back-end:latest)"
if [[ -n "$back_after" && "$back_before" != "$back_after" ]]; then
  echo "image changed: back-end:latest"
  changed=1
fi

if [[ "$changed" -eq 1 ]]; then
  echo "replaying podman-kube@website.service"
  systemctl --user restart podman-kube@website.service
else
  echo "images unchanged; skipping pod restart"
fi