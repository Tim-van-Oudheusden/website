#!/usr/bin/env bash
# Enforce overall code-coverage floors for a workspace's unit test suite.
#
# Usage:
#   scripts/coverage-check.sh <workspace> <min-funcs-pct> <min-lines-pct>
#
# Runs the workspace's tests with Bun's built-in coverage (bun test --coverage)
# and fails if the overall (aggregate) function or line coverage drops below the
# given floors. Tests are discovered under ../test/<workspace>.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

workspace="${1:?usage: coverage-check.sh <workspace> <min-funcs-pct> <min-lines-pct>}"
min_funcs="${2:?min funcs % required}"
min_lines="${3:?min lines % required}"

cd "$ROOT/$workspace"

# Capturing with 2>&1 keeps the full coverage table for the report below. The
# report is always printed: when bun test fails (any test failure), errexit on
# the command substitution would otherwise swallow the diagnostics entirely.
test_status=0
report="$(bun test "../test/$workspace" --coverage 2>&1)" || test_status=$?
printf '%s\n' "$report"
if [ "$test_status" -ne 0 ]; then
  echo "bun test failed with status ${test_status}; see report above" >&2
  exit "$test_status"
fi

metrics="$(printf '%s\n' "$report" | awk -F'|' '
  /^All files[[:space:]]*\|/ {
    gsub(/[[:space:]]/, "", $2)
    gsub(/[[:space:]]/, "", $3)
    print $2, $3
    exit
  }')"

if [ -z "$metrics" ]; then
  echo "Coverage summary row not found in bun test output" >&2
  exit 1
fi

funcs="${metrics%% *}"
lines="${metrics##* }"

echo "Coverage ($workspace): funcs ${funcs}%, lines ${lines}% (floors: ${min_funcs}% funcs, ${min_lines}% lines)"

if ! awk -v f="$funcs" -v l="$lines" -v mf="$min_funcs" -v ml="$min_lines" \
    'BEGIN { exit !(f >= mf && l >= ml) }'; then
  echo "Coverage ($workspace) is below the configured floor" >&2
  exit 1
fi