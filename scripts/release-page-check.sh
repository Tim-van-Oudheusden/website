#!/usr/bin/env bash
# Fail when a project page is older than its repository's latest GitHub release.
#
# Usage:
#   scripts/release-page-check.sh <content-dir>
#
# For every Markdown file under <content-dir> whose front matter has
# `type: project` and a `links` entry of `type: repo` on github.com, looks up
# the repository's latest release through the GitHub REST API (unauthenticated;
# drafts and pre-releases are never "latest") and compares the day it was
# published (UTC) with the page's `updated:` date, or `date:` when there is
# none. A release from a later day means the page missed it. A repository with
# no release passes.
#
# Prints one line per stale page and one per page it could not check to
# stdout, naming the file relative to <content-dir>. Exits 1 if a page is
# stale, and 2 if it could not check a page (network or API error, or a page
# with no date), even after listing a stale one: "could not check" is not a
# pass. Needs curl and jq. scripts/nightly-compliance.sh runs this.
set -uo pipefail

content_dir="${1:?usage: release-page-check.sh <content-dir>}"
api="https://api.github.com"
day_re='^[0-9]{4}-[0-9]{2}-[0-9]{2}$'

if [ ! -d "$content_dir" ]; then
  echo "release-page-check: $content_dir is not a directory" >&2
  exit 2
fi

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

# Print "<type>|<day>|<owner/repo>" from a file's front matter: <day> is the
# first ten characters of `updated:`, else of `date:`; <owner/repo> comes from
# the first `links` item with `type: repo` and a github.com repository href.
# Values lose surrounding quotes and an unquoted value its ` # comment`.
front_matter() {
  awk '
    function clean(v) {
      sub(/\r$/, "", v)
      if (v ~ /^"/) { sub(/^"/, "", v); sub(/"[ \t]*(#.*)?$/, "", v); return v }
      if (v ~ /^\047/) { sub(/^\047/, "", v); sub(/\047[ \t]*(#.*)?$/, "", v); return v }
      sub(/(^|[ \t]+)#.*$/, "", v)
      sub(/[ \t]+$/, "", v)
      return v
    }
    function end_item() {
      if (repo == "" && item_type == "repo" && item_href ~ /^https:\/\/github\.com\/[^\/]+\/[^\/]+\/?$/) {
        repo = item_href
        sub(/^https:\/\/github\.com\//, "", repo)
        sub(/\/$/, "", repo)
        sub(/\.git$/, "", repo)
      }
      item_type = ""
      item_href = ""
    }
    NR == 1 { if ($0 !~ /^---[ \t\r]*$/) exit; next }
    /^---[ \t\r]*$/ { exit }
    /^[^ \t#-][^:]*:/ {
      if (in_links) end_item()
      key = $0; sub(/[ \t]*:.*/, "", key)
      value = $0; sub(/^[^:]*:[ \t]*/, "", value)
      in_links = (key == "links")
      if (key == "type") type = clean(value)
      else if (key == "updated") updated = clean(value)
      else if (key == "date") date = clean(value)
      next
    }
    in_links {
      line = $0
      if (line ~ /^[ \t]*-[ \t]/) { end_item(); sub(/^[ \t]*-[ \t]+/, "", line) }
      sub(/^[ \t]+/, "", line)
      key = line; sub(/[ \t]*:.*/, "", key)
      value = line; sub(/^[^:]*:[ \t]*/, "", value)
      if (key == "type") item_type = clean(value)
      else if (key == "href") item_href = clean(value)
    }
    END {
      if (in_links) end_item()
      day = updated != "" ? updated : date
      print type "|" substr(day, 1, 10) "|" repo
    }
  ' "$1"
}

status=0

unchecked() {
  echo "\`$1\`: $2"
  status=2
}

while IFS= read -r -d '' file; do
  page="${file#"$content_dir"/}"
  IFS='|' read -r type day repo < <(front_matter "$file")

  if [ "$type" != project ] || [ -z "$repo" ]; then
    continue
  fi

  if ! [[ "$day" =~ $day_re ]]; then
    unchecked "$page" "has no updated: or date: to compare with ${repo}'s releases"
    continue
  fi

  code="$(curl -sS --max-time 10 \
    -H 'Accept: application/vnd.github+json' \
    -H 'X-GitHub-Api-Version: 2022-11-28' \
    -o "$body" -w '%{http_code}' \
    "$api/repos/$repo/releases/latest")"
  curl_exit=$?

  if [ "$curl_exit" -ne 0 ]; then
    unchecked "$page" "could not look up the latest release of $repo (curl exit $curl_exit)"
    continue
  fi

  case "$code" in
    200) ;;
    404) continue ;; # no release yet
    *)
      unchecked "$page" "could not look up the latest release of $repo (HTTP $code)"
      continue
      ;;
  esac

  IFS='|' read -r tag published < <(jq -r '"\(.tag_name)|\(.published_at // "" | .[0:10])"' "$body")

  if ! [[ "$published" =~ $day_re ]]; then
    unchecked "$page" "could not read the latest release of $repo from the API response"
    continue
  fi

  if [[ "$published" > "$day" ]]; then
    echo "\`$page\` is dated $day; $repo $tag was released $published"
    [ "$status" -eq 2 ] || status=1
  fi
done < <(find "$content_dir" -type f -name '*.md' -print0 | sort -z)

exit "$status"
