#!/usr/bin/env bash
# Merge queue for main: merges ready pull requests one at a time, each after
# re-running the gates on top of the latest main. Driven by
# .github/workflows/merge-queue.yml; see docs/multi-agent.md.
#
# Usage:
#   scripts/merge-queue.sh next
#       From a full-history checkout of main: pick the oldest pull request that
#       is ready to merge and write number=, head= and main= to $GITHUB_OUTPUT.
#       Writes nothing when none is ready.
#   scripts/merge-queue.sh land <number> <head-sha> <verified-main-sha>
#       Merge the pull request at <head-sha> if main is still the commit it was
#       verified on and the pull request is still ready, then start main's push
#       workflows (a merge made with GITHUB_TOKEN starts none) and the next run.
#   scripts/merge-queue.sh reject <number> <run-url>
#       Hold a pull request that failed verification, link the run, move on.
#
# Ready means: from this repository (not a fork), not a draft, no `hold` or
# `sentinel-alert` label, every required check passing (merge state CLEAN), and
# not high risk by scripts/tier-classify.sh — high-risk changes, and PRs Hive's
# sentinel flagged, wait for the maintainer.
# Needs gh authenticated (GH_TOKEN) and pointed at the repository (GH_REPO, or
# run from a checkout).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOLD_LABEL=hold
# Hive's sentinel sweep sets it on a PR that touches sensitive files or looks
# like it weakens a gate; a maintainer reviews the PR and removes it.
SENTINEL_LABEL=sentinel-alert

# Picks up runs that land, reject or skip a pull request, so each merge is
# verified against the main it lands on.
queue_next_run() {
  gh workflow run merge-queue.yml --ref main
}

# GitHub computes the merge state lazily and answers UNKNOWN until it has.
merge_state() {
  local state attempt
  for attempt in 1 2 3; do
    state="$(gh pr view "$1" --json mergeStateStatus --jq .mergeStateStatus)"
    [ "$state" != UNKNOWN ] && break
    [ "$attempt" -lt 3 ] && sleep 5
  done
  echo "$state"
}

# Prints the risk tier of the change from main to <sha>, as tier-classifier.yml
# rates it: renames listed under their old path too.
tier_of() {
  git diff -z --name-only --no-renames "HEAD...$1" | "$HERE/tier-classify.sh" -z | sed -n 's/^tier=//p'
}

# GitHub does not act on `Fixes #N` when GITHUB_TOKEN merges a pull request,
# so close the issues it links ourselves. By URL, so a link to another
# repository closes that issue, not this repository's issue with the same
# number. The merge has landed by now: failing to read the links or to close
# an issue is a warning, not a reason to skip main's workflows or the next run.
# The links are read into a variable first: bash drops the exit status of a
# `< <(...)` process, so a failed lookup would look like a PR that links none.
close_linked_issues() {
  local number="$1" issues issue
  if ! issues="$(gh pr view "$number" --json closingIssuesReferences --jq '.closingIssuesReferences[].url')"; then
    echo "::warning title=Merge queue::could not read the issues #${number} closes; close them by hand"
    return 0
  fi
  while read -r issue; do
    [ -n "$issue" ] || continue
    gh issue close "$issue" --reason completed \
      --comment "Closed by #${number}, which the merge queue merged." \
      || echo "::warning title=Merge queue::could not close ${issue} after merging #${number}"
  done <<< "$issues"
}

next() {
  local candidates number head tier
  # gh lists open pull requests by default; --jq runs gh's built-in jq, so the
  # runner needs no jq. Listed into a variable so a failed listing fails the
  # job (set -e) instead of passing for an empty queue.
  candidates="$(HOLD="$HOLD_LABEL" SENTINEL="$SENTINEL_LABEL" gh pr list --base main --limit 100 \
    --json number,headRefOid,isDraft,isCrossRepository,labels \
    --jq 'sort_by(.number) | .[]
      | select((.isDraft or .isCrossRepository) | not)
      | select(all(.labels[]; .name != env.HOLD and .name != env.SENTINEL))
      | "\(.number) \(.headRefOid)"')"
  while read -r number head; do
    # An empty listing still reads one empty line.
    [ -n "$number" ] || continue
    [ "$(merge_state "$number")" = CLEAN ] || continue
    git fetch --no-tags --quiet origin "refs/pull/${number}/head"
    # A push since the listing: the next run sees it.
    [ "$(git rev-parse FETCH_HEAD)" = "$head" ] || continue
    tier="$(tier_of "$head")"
    if [ "$tier" = high ]; then
      echo "::notice title=Merge queue::#${number} is high risk (docs/risk-tiers.md); the maintainer merges it"
      continue
    fi
    {
      echo "number=${number}"
      echo "head=${head}"
      echo "main=$(git rev-parse HEAD)"
    } >> "$GITHUB_OUTPUT"
    return 0
  done <<< "$candidates"
}

land() {
  local number="$1" head="$2" verified_main="$3" main ready
  main="$(git ls-remote origin refs/heads/main | cut -f1)"
  if [ "$main" != "$verified_main" ]; then
    echo "::notice title=Merge queue::main moved since #${number} was verified; verifying again"
    queue_next_run
    return 0
  fi

  ready="$(HOLD="$HOLD_LABEL" SENTINEL="$SENTINEL_LABEL" gh pr view "$number" --json isDraft,labels \
    --jq '(.isDraft | not) and all(.labels[]; .name != env.HOLD and .name != env.SENTINEL)')"
  if [ "$ready" != true ] || [ "$(merge_state "$number")" != CLEAN ]; then
    echo "::notice title=Merge queue::#${number} stopped being ready during verification; skipped"
    queue_next_run
    return 0
  fi

  # --match-head-commit refuses the merge if the branch moved past what was verified.
  gh pr merge "$number" --merge --match-head-commit "$head"
  close_linked_issues "$number"
  for workflow in ci.yml coverage-gate.yml quality-report.yml; do
    gh workflow run "$workflow" --ref main
  done
  queue_next_run
}

reject() {
  local number="$1" run_url="$2"
  gh pr edit "$number" --add-label "$HOLD_LABEL"
  gh pr comment "$number" --body "The merge queue held this pull request: the gates failed on it merged with the latest main (${run_url}). Fix it and remove the \`${HOLD_LABEL}\` label to queue it again."
  queue_next_run
}

usage() {
  echo "usage: $0 next | land <number> <head-sha> <verified-main-sha> | reject <number> <run-url>" >&2
  exit 2
}

case "${1:-}" in
  next) [ "$#" -eq 1 ] || usage; next ;;
  land) [ "$#" -eq 4 ] || usage; land "$2" "$3" "$4" ;;
  reject) [ "$#" -eq 3 ] || usage; reject "$2" "$3" ;;
  *) usage ;;
esac
