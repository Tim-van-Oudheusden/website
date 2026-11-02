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
#
# The pod manifest travels with the back-end image (#1088): CI builds both
# images from one commit, and the back-end image carries that commit's deploy/
# files under /opt/website/deploy. When the back-end digest changes, the new
# image's prod.yaml is checked by the host's validate-manifest.ts (run with bun
# from the previously running back-end image, no network) and installed over
# $WEBSITE_REPO/deploy/kube/prod.yaml before the replay. A manifest that fails
# the check rejects the new images like a failed health check; a failed replay
# puts the previous manifest back along with the previous images. This script,
# validate-manifest.ts and the systemd units are never taken from an image: a
# host copy that differs from main's is only reported ("drift: ..."), for an
# operator to copy by hand (docs/deploy.md).
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

readonly repo_dir="${WEBSITE_REPO:-$HOME/Git/website}"
readonly manifest="$repo_dir/deploy/kube/prod.yaml"
readonly manifest_backup="$state_dir/prod.yaml.previous"
readonly unit_dir="${XDG_CONFIG_HOME:-$HOME/.config}/systemd/user"
# Where back-end/Dockerfile puts main's deploy/ files in the image.
readonly image_deploy=/opt/website/deploy

# Copies main's deploy files out of the new back-end :latest into $1, keeping
# their deploy/ layout. A file the image lacks (an image built before #1088)
# is simply missing afterwards.
extract_deploy_files() {
  local into="$1"
  local cid file
  cid="$(podman create "$registry/back-end:latest")" || return 1
  for file in kube/prod.yaml systemd/website-update.sh systemd/validate-manifest.ts \
    systemd/podman-kube@.service systemd/website-update.service systemd/website-update.timer; do
    mkdir -p "$into/$(dirname "$file")"
    podman cp "$cid:$image_deploy/$file" "$into/$file" >/dev/null 2>&1 || true
  done
  podman rm "$cid" >/dev/null 2>&1 || true
}

# Reports each host copy that differs from main's copy in the image. These are
# never installed automatically: a broken updater could not roll itself back.
warn_drift() {
  local from="$1"
  local label host_copy image_copy
  while IFS='|' read -r label host_copy image_copy; do
    if [[ -f "$image_copy" ]] && ! cmp -s "$host_copy" "$image_copy"; then
      echo "drift: $label differs from main's copy in the image; copy it by hand (docs/deploy.md)" >&2
    fi
  done <<EOF
deploy/systemd/website-update.sh|$repo_dir/deploy/systemd/website-update.sh|$from/systemd/website-update.sh
deploy/systemd/validate-manifest.ts|$repo_dir/deploy/systemd/validate-manifest.ts|$from/systemd/validate-manifest.ts
podman-kube@.service|$unit_dir/podman-kube@.service|$from/systemd/podman-kube@.service
website-update.service|$unit_dir/website-update.service|$from/systemd/website-update.service
website-update.timer|$unit_dir/website-update.timer|$from/systemd/website-update.timer
EOF
}

# Runs the host's validate-manifest.ts on $1 with bun from the previously
# running back-end image, offline: the new image supplies the manifest but none
# of the code that judges it. Succeeds only when the manifest passes.
check_manifest() {
  local check_dir passed=0
  check_dir="$(mktemp -d)"
  cp "$1" "$check_dir/prod.yaml"
  cp "$repo_dir/deploy/systemd/validate-manifest.ts" "$check_dir/validate-manifest.ts"
  # Readable by the image's unprivileged bun user, not just the host user.
  chmod 755 "$check_dir"
  chmod 644 "$check_dir"/*
  if podman run --rm --network none -v "$check_dir:/check:ro,z" --entrypoint bun \
    "$registry/back-end:rollback" /check/validate-manifest.ts /check/prod.yaml; then
    passed=1
  fi
  rm -rf "$check_dir"
  [[ "$passed" -eq 1 ]]
}

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

# Puts every changed image that had a previous one back on :latest and
# remembers its new digest as rejected.
reject_changed() {
  local name
  for name in "${changed[@]}"; do
    if [[ -n "${before[$name]}" ]]; then
      restore_rollback "$name"
      reject "$name" "${after[$name]}"
      echo "rejected: $name:latest ${after[$name]}" >&2
    fi
  done
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
    # A local :latest already on the rejected digest is the one an earlier
    # unheld tick pulled; the pod never ran it, so it holds nothing back.
    if [[ -n "${before[$name]}" && "${before[$name]}" != "${after[$name]}" ]]; then
      restore_rollback "$name"
    else
      echo "no previously running $name image to hold back ${after[$name]}; it stays on :latest" >&2
      unheld+=("$name")
    fi
  elif [[ -n "${after[$name]}" && "${before[$name]}" != "${after[$name]}" ]]; then
    echo "image changed: $name:latest ${before[$name]:-(none)} -> ${after[$name]}"
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

installed_new_manifest=0
if [[ " ${changed[*]} " == *" back-end "* ]]; then
  incoming="$(mktemp -d)"
  extract_deploy_files "$incoming" || true
  warn_drift "$incoming"
  if [[ ! -f "$incoming/kube/prod.yaml" ]]; then
    echo "the new back-end image carries no manifest; keeping the installed manifest"
  elif cmp -s "$incoming/kube/prod.yaml" "$manifest"; then
    echo "manifest unchanged"
  elif [[ -z "${before[back-end]}" ]]; then
    echo "no previous back-end image to check the new manifest with; keeping the installed manifest" >&2
  elif [[ ! -f "$repo_dir/deploy/systemd/validate-manifest.ts" ]]; then
    echo "no host copy of deploy/systemd/validate-manifest.ts; keeping the installed manifest" >&2
  elif check_manifest "$incoming/kube/prod.yaml"; then
    mkdir -p "$state_dir"
    cp "$manifest" "$manifest_backup"
    cp "$incoming/kube/prod.yaml" "$manifest.new"
    mv "$manifest.new" "$manifest"
    installed_new_manifest=1
    echo "manifest updated from the back-end image"
  else
    rm -rf "$incoming"
    echo "manifest REJECTED: the new back-end image's prod.yaml fails validate-manifest.ts; not replaying" >&2
    reject_changed
    exit 1
  fi
  rm -rf "$incoming"
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

reject_changed

if [[ "$installed_new_manifest" -eq 1 ]]; then
  cp "$manifest_backup" "$manifest"
  echo "restored the previous manifest" >&2
fi

echo "replaying podman-kube@website.service with rolled-back image(s)" >&2
systemctl --user restart podman-kube@website.service

exit 1
