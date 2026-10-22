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
# and a failed replay or health check re-tags the rollback image(s) onto :latest, replays again,
# and exits non-zero so the failure shows up in `systemctl --user status` /
# the journal (there's no alerting backend for this site).
#
# A rolled-back digest is remembered as rejected (#811). Otherwise the next
# tick would see the registry's bad :latest differ from the restored local one
# and replay it again, every 5 minutes, until a fixed image is pushed. While the
# registry still serves a rejected digest, the rollback image stays on :latest,
# the pod is not replayed for it, and the run exits non-zero. Pushing a new
# digest clears this. To retry the same digest anyway, delete its file under
# the state directory below.
#
# Holding a rejected digest back needs a previously running image. With none
# (the state directory outlived the image store, e.g. after `podman rmi`), the
# rejected digest stays on :latest, so the pod is not replayed at all: a replay
# would start it and then blame the other image's new digest for the failure.
#
# Every image listed in `images` below must be one the pod runs: its ref
# "$registry/<name>:latest" must match deploy/kube/prod.yaml exactly.
set -euo pipefail

state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/website-update"

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

# The digest last rolled back for an image name (front-end/back-end), if any.
rejected_digest() {
  cat "$state_dir/rejected-$1" 2>/dev/null || true
}

reject() {
  mkdir -p "$state_dir"
  printf '%s\n' "$2" > "$state_dir/rejected-$1"
}

readonly registry=ghcr.io/tim-van-oudheusden/website
readonly images=(front-end back-end)

# Per image name: the :latest digest before and after the pull.
declare -A before=() after=()
# Image names whose new :latest the pod replay will pick up.
changed=()
still_rejected=0
# Still-rejected image names with no previously running image to hold them back.
unheld=()

# Puts the :rollback reference back onto :latest.
restore_rollback() {
  podman tag "$registry/$1:rollback" "$registry/$1:latest"
}

# Tags the running image as :rollback, pulls :latest, then either holds back a
# rejected digest or records the image as changed. Every image goes through
# this one path, so a safety check added here protects all of them.
sync_image() {
  local name="$1"
  local ref="$registry/$name"

  before[$name]="$(digest "$ref:latest")"
  if [[ -n "${before[$name]}" ]]; then
    podman tag "$ref:latest" "$ref:rollback"
  fi
  podman pull "$ref:latest"
  after[$name]="$(digest "$ref:latest")"

  if [[ -n "${after[$name]}" && "${after[$name]}" == "$(rejected_digest "$name")" ]]; then
    echo "still rejected: $name:latest ${after[$name]}" >&2
    still_rejected=1
    if [[ -n "${before[$name]}" ]]; then
      restore_rollback "$name"
    else
      echo "no previously running $name image to hold back ${after[$name]}; it stays on :latest" >&2
      unheld+=("$name")
    fi
  elif [[ -n "${after[$name]}" && "${before[$name]}" != "${after[$name]}" ]]; then
    echo "image changed: $name:latest"
    changed+=("$name")
  fi
}

for name in "${images[@]}"; do
  sync_image "$name"
done

if [[ "${#changed[@]}" -eq 0 ]]; then
  echo "images unchanged; skipping pod restart"
  exit "$still_rejected"
fi

# Keep :latest on what the pod still runs, so a later tick sees each new
# digest again and replays it once nothing rejected would start with it.
if [[ "${#unheld[@]}" -gt 0 ]]; then
  echo "skipping pod restart: a rejected image has nothing to roll back to" >&2
  for name in "${changed[@]}"; do
    if [[ -n "${before[$name]}" ]]; then
      restore_rollback "$name"
    fi
  done
  exit 1
fi

echo "replaying podman-kube@website.service"

# A replay that fails outright (kube play exits "failed to start N containers",
# e.g. an image whose entrypoint or user is missing) takes the same rollback
# path as an unhealthy one. Unguarded, set -e would end the run here with the
# pod down, and the next tick would see no digest change and exit 0.
if systemctl --user restart podman-kube@website.service \
  && wait_healthy http://127.0.0.1:8300/health \
  && wait_healthy http://127.0.0.1:8301/health; then
  echo "update healthy: front-end and back-end both answered /health"
  exit "$still_rejected"
fi

echo "update FAILED (pod replay or health check): rolling back to the previously running image(s)" >&2

for name in "${changed[@]}"; do
  if [[ -n "${before[$name]}" ]]; then
    restore_rollback "$name"
    reject "$name" "${after[$name]}"
  fi
done

echo "replaying podman-kube@website.service with rolled-back image(s)" >&2
systemctl --user restart podman-kube@website.service

exit 1
