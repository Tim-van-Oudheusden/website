#!/usr/bin/env bash
# File a GitHub issue for a failed scheduled run, or comment on the one already open.
#
# Usage:
#   scripts/auto-issue.sh <title> <report.md> <run-url>
#
# The issue or comment links the failed run and includes its Markdown report,
# or says there is none (a run can fail before writing it).
# An open issue titled exactly <title> gets a comment instead of a duplicate, so
# a check that fails every night keeps one issue until it is fixed and closed.
# Needs gh authenticated (GH_TOKEN) and pointed at the repository (GH_REPO, or
# run from a checkout).
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <title> <report.md> <run-url>" >&2
  exit 2
fi

title="$1"
report="$2"
run_url="$3"

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

{
  echo "The scheduled run failed: ${run_url}"
  echo
  if [ -s "$report" ]; then
    cat "$report"
  else
    echo "The run left no report; see its log."
  fi
} > "$body"

# gh lists open issues by default; --jq runs gh's built-in jq, so the runner needs no jq.
number="$(TITLE="$title" gh issue list --limit 1000 --json number,title \
  --jq 'map(select(.title == env.TITLE)) | first | .number // empty')"

if [ -n "$number" ]; then
  gh issue comment "$number" --body-file "$body"
else
  gh issue create --title "$title" --body-file "$body"
fi
