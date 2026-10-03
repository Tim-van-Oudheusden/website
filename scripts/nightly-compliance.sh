#!/usr/bin/env bash
# Print a Markdown nightly compliance report for the repository to stdout.
#
# Usage:
#   scripts/nightly-compliance.sh > nightly-compliance.md
#
# Checks that can go stale without a code change, so they run on a schedule
# rather than only on push:
#   - Dependency audit: `bun audit` finds no high or critical advisories in
#     the locked dependency tree.
#   - Draft leak guard: no `draft: true` front matter in content/ (CONTENT_DIR
#     overrides the directory), the same rule the release job enforces.
# Check output goes to stderr so stdout stays a clean report. Every check runs
# even when an earlier one fails; the script exits non-zero if any failed.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

commit="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
content_dir="${CONTENT_DIR:-$ROOT/content}"
failed=0

row() {
  if [ "$2" -eq 0 ]; then
    echo "| $1 | ✅ pass |"
  else
    echo "| $1 | ❌ fail |"
    failed=1
  fi
}

echo "# Nightly compliance"
echo
echo "Commit: \`${commit}\`"
echo
echo "| Check | Result |"
echo "| ----- | ------ |"

bun audit --audit-level=high >&2
row "Dependency audit (high+)" $?

if grep -RIl '^draft:[[:space:]]*true[[:space:]]*$' "$content_dir" >&2; then
  row "Draft leak guard" 1
else
  row "Draft leak guard" 0
fi

exit "$failed"
