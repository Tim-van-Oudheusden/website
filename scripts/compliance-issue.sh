#!/usr/bin/env bash
# Keep one GitHub tracking issue in step with the Nightly compliance result.
#
# Usage:
#   REPO=owner/repo RUN_URL=<run url> scripts/compliance-issue.sh <success|failure> [report.md]
#
# - failure: open an issue labelled `nightly-compliance` with the run's report,
#   or comment the new report on the one already open, so a run that keeps
#   failing never opens a second issue.
# - success: close the open tracking issue, if any, with a link to the run.
# A missing report file still files the issue, pointing at the run's log.
# Called by .github/workflows/auto-issues.yml; needs `gh` with issues: write.
set -euo pipefail

LABEL=nightly-compliance
TITLE="Nightly compliance is failing"

conclusion="${1:-}"
report="${2:-}"
: "${REPO:?REPO must be set to owner/repo}"
: "${RUN_URL:?RUN_URL must be set to the compliance run URL}"

case "$conclusion" in
  success | failure) ;;
  *)
    echo "compliance-issue: conclusion must be success or failure, got '${conclusion}'" >&2
    exit 2
    ;;
esac

open_issue="$(gh issue list --repo "$REPO" --state open --label "$LABEL" \
  --json number --jq '.[0].number // empty')"

if [ "$conclusion" = success ]; then
  if [ -n "$open_issue" ]; then
    gh issue close "$open_issue" --repo "$REPO" \
      --comment "Nightly compliance passed again in ${RUN_URL}. Closing."
  fi
  exit 0
fi

body="$(mktemp)"
trap 'rm -f "$body"' EXIT
{
  echo "Nightly compliance failed in ${RUN_URL}."
  echo
  if [ -n "$report" ] && [ -f "$report" ]; then
    cat "$report"
  else
    echo "The run left no report; see the run log for the failing step."
  fi
} > "$body"

if [ -n "$open_issue" ]; then
  gh issue comment "$open_issue" --repo "$REPO" --body-file "$body"
else
  # `gh issue create --label` fails on a label the repository doesn't have yet.
  gh label create "$LABEL" --repo "$REPO" --force --color B60205 \
    --description "Tracking issue for failing Nightly compliance runs"
  {
    echo
    echo "This issue was opened by \`.github/workflows/auto-issues.yml\`. Later"
    echo "failing runs comment here; the next passing run closes it."
  } >> "$body"
  gh issue create --repo "$REPO" --title "$TITLE" --label "$LABEL" --body-file "$body"
fi
