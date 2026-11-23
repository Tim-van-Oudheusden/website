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
#   - Project pages current with releases: no `type: project` page in content/
#     is older than the latest GitHub release of its first github.com
#     `type: repo` link. A page's day is `updated:`, else `date:`, else
#     `publishDate:`; a release on that day counts as covered, and a
#     repository with no release passes. The report lists each page behind.
#   - Project release lookup: every one of those releases could be read
#     (curl, jq). A failed lookup fails this row, not the one above, since it
#     says nothing about the page.
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

# Print "<file>\t<owner/repo>\t<page day>" when $1 is a project page with a
# github.com `type: repo` link, reading the front matter as
# docs/content-authoring.md writes it: unindented top-level keys and `links:`
# items of `key: value` lines. Values may be quoted or end in ` # comment`.
project_repo() {
  awk -v file="$(basename "$1")" '
    function value(line,   first) {
      sub(/^[[:space:]]*(- )?[A-Za-z]+:[[:space:]]*/, "", line)
      sub(/[[:space:]]+#.*$/, "", line)
      sub(/[[:space:]]+$/, "", line)
      first = substr(line, 1, 1)
      if (length(line) >= 2 && (first == "\"" || first == "\047") && substr(line, length(line)) == first) {
        line = substr(line, 2, length(line) - 2)
      }
      return line
    }
    function end_link() {
      if (repo == "" && link_type == "repo" && link_href ~ /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/) {
        repo = link_href
        sub(/^https:\/\/github\.com\//, "", repo)
        sub(/\/$/, "", repo)
        sub(/\.git$/, "", repo)
      }
      link_type = ""
      link_href = ""
    }
    NR == 1 { if ($0 !~ /^---[[:space:]]*$/) exit; next }
    /^---[[:space:]]*$/ { closed = 1; exit }
    /^[^[:space:]#-]/ { end_link(); in_links = 0 }
    /^type:/ { type = value($0) }
    /^updated:/ { updated = value($0) }
    /^date:/ { date = value($0) }
    /^publishDate:/ { publish_date = value($0) }
    /^links:/ { in_links = 1; next }
    in_links && /^[[:space:]]*- / { end_link() }
    in_links && /^[[:space:]]*(- )?type:/ { link_type = value($0) }
    in_links && /^[[:space:]]*(- )?href:/ { link_href = value($0) }
    END {
      end_link()
      day = updated != "" ? updated : (date != "" ? date : publish_date)
      if (closed && type == "project" && repo != "") print file "\t" repo "\t" day
    }
  ' "$1"
}

pages_behind=0
lookups_failed=0
release_notes=()
release_body="$(mktemp)"
trap 'rm -f "$release_body"' EXIT

for page in "$content_dir"/*.md; do
  [ -f "$page" ] || continue
  found="$(project_repo "$page")"
  [ -n "$found" ] || continue
  IFS=$'\t' read -r file repo day <<< "$found"

  # GitHub answers 404 for a repository without a (non-pre-)release.
  http_code="$(curl -sS --max-time 30 -H 'Accept: application/vnd.github+json' \
    -o "$release_body" -w '%{http_code}' "https://api.github.com/repos/$repo/releases/latest")"
  curl_status=$?
  release=""
  if [ "$curl_status" -ne 0 ]; then
    problem="curl exited $curl_status"
  elif [ "$http_code" = 404 ]; then
    continue
  elif [ "$http_code" != 200 ]; then
    problem="HTTP $http_code"
  else
    release="$(jq -r 'if (.tag_name | type) == "string" and (.published_at | type) == "string"
      then "\(.tag_name)\t\(.published_at[0:10])" else empty end' "$release_body")"
    problem="no tag or publish date in the response"
  fi

  if [ -z "$release" ]; then
    lookups_failed=1
    release_notes+=("- \`$file\`: could not read the latest release of $repo ($problem)")
    continue
  fi

  IFS=$'\t' read -r tag published <<< "$release"
  if [[ "$published" > "$day" ]]; then
    pages_behind=1
    release_notes+=("- \`$file\` is dated $day, but $repo released $tag on $published")
  fi
done

row "Project pages current with releases" "$pages_behind"
row "Project release lookup" "$lookups_failed"

if [ "${#release_notes[@]}" -gt 0 ]; then
  echo
  echo "## Project pages and releases"
  echo
  printf '%s\n' "${release_notes[@]}"
fi

exit "$failed"
