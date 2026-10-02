#!/usr/bin/env bash
# Print a Markdown quality report for the repository to stdout.
#
# Usage:
#   scripts/quality-report.sh > quality-report.md
#
# Runs every quality gate (lint, typecheck, unit tests, build) and each
# workspace's unit tests with Bun's built-in coverage, then reports pass/fail
# per gate and the overall function/line coverage per workspace. Gate and test
# output goes to stderr so stdout stays a clean report. Every gate runs even
# when an earlier one fails; the script exits non-zero if any of them failed.
# The coverage floors themselves are enforced by scripts/coverage-check.sh.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

commit="${GITHUB_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
failed=0

echo "# Quality report"
echo
echo "Commit: \`${commit}\`"
echo
echo "## Quality gates"
echo
echo "| Gate | Result |"
echo "| ---- | ------ |"
for gate in lint typecheck test build; do
  if bun run "$gate" >&2; then
    result="✅ pass"
  else
    result="❌ fail"
    failed=1
  fi
  echo "| \`bun run ${gate}\` | ${result} |"
done

echo
echo "## Unit-test coverage"
echo
echo "| Workspace | Functions | Lines |"
echo "| --------- | --------- | ----- |"
for workspace in back-end shared front-end; do
  test_status=0
  report="$(cd "$ROOT/$workspace" && bun test "../test/$workspace" --coverage 2>&1)" || test_status=$?
  printf '%s\n' "$report" >&2

  metrics="$(printf '%s\n' "$report" | awk -F'|' '
    /^All files[[:space:]]*\|/ {
      gsub(/[[:space:]]/, "", $2)
      gsub(/[[:space:]]/, "", $3)
      print $2, $3
      exit
    }')"

  # A failing test run makes its coverage numbers meaningless, so report n/a.
  if [ "$test_status" -ne 0 ] || [ -z "$metrics" ]; then
    echo "| ${workspace} | ❌ n/a | ❌ n/a |"
    failed=1
  else
    echo "| ${workspace} | ${metrics%% *}% | ${metrics##* }% |"
  fi
done

exit "$failed"
