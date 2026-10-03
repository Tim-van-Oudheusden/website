#!/usr/bin/env bash
# Change classification: reads changed file paths (one per line) on stdin,
# prints each path with its risk tier, then the PR's overall tier as
# `tier=<low|medium|high>`. Tiers are defined in docs/risk-tiers.md; the
# highest tier of any changed file wins, and unrecognised paths are medium.
set -uo pipefail

names=(_ low medium high)

rank() {
  case "$1" in
    .github/* | deploy/* | scripts/* | .devcontainer/* | */Dockerfile | Dockerfile* \
      | package.json | */package.json | bun.lock \
      | AGENTS.md | CLAUDE.md | .claude/* | .cursor/* | .beads/* | prompts/*) echo 3 ;;
    content/* | docs/* | research/* | public/* | *.md) echo 1 ;;
    *) echo 2 ;;
  esac
}

max=1
while IFS= read -r path || [ -n "$path" ]; do
  [ -n "$path" ] || continue
  r="$(rank "$path")"
  printf '%-6s  %s\n' "${names[$r]}" "$path"
  [ "$r" -gt "$max" ] && max="$r"
done

echo "tier=${names[$max]}"
