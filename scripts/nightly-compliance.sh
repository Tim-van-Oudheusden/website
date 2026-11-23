#!/usr/bin/env bash
# Print a Markdown nightly compliance report for the repository to stdout.
#
# Usage:
#   scripts/nightly-compliance.sh > nightly-compliance.md
#
# Checks that can go stale without a code change, so they run on a schedule
# rather than only on push:
#   - Dependency audit: `bun audit` finds no high or critical advisories in
#     the locked dependency tree, except those in AUDIT_IGNORE below.
#   - Draft leak guard: scripts/draft-leak-guard.sh finds no `draft: true` front
#     matter in content/ (CONTENT_DIR overrides the directory), the same check
#     the release job runs.
#   - Project pages current with releases: scripts/release-page-check.sh finds
#     no project page in content/ dated before its repository's latest GitHub
#     release. The pages it lists, stale or unchecked, follow the table, so the
#     issue auto-issues.yml files for a failed run says what to update.
# Other check output goes to stderr so stdout stays a clean report. Every check
# runs even when an earlier one fails; the script exits non-zero if any failed.
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

# Advisories with no patched release upstream, so no override can fix them.
# Remove an entry once a fix ships and the lockfile picks it up.
#   GHSA-vfj7-8cjw-p6xm: braces <=3.0.3 stack-exhaustion DoS. Dev-only, via
#     shadcn CLI › fast-glob › micromatch; no patched braces release exists.
#   GHSA-fc5q-39xc-vjpf: picomatch <=4.0.7 extglob ReDoS. Dev/build-only, via
#     vite, shadcn, tinyglobby and the ESLint plugins, which match only
#     repository-authored globs; 4.0.7 is the latest picomatch release.
AUDIT_IGNORE=(GHSA-vfj7-8cjw-p6xm GHSA-fc5q-39xc-vjpf)
bun audit --audit-level=high "${AUDIT_IGNORE[@]/#/--ignore=}" >&2
row "Dependency audit (high+)" $?

"$ROOT/scripts/draft-leak-guard.sh" "$content_dir" >&2
row "Draft leak guard" $?

release_pages="$("$ROOT/scripts/release-page-check.sh" "$content_dir")"
row "Project pages current with releases" $?

if [ -n "$release_pages" ]; then
  echo
  echo "## Project pages behind their releases"
  echo
  echo "Read each page against its release notes, then update it and its \`updated:\` date."
  echo
  printf '%s\n' "$release_pages" | sed 's/^/- /'
fi

exit "$failed"
