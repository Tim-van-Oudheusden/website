#!/usr/bin/env bash
# Automated review application: apply the ```suggestion blocks of PR review
# comments to the checkout in the current directory.
# Reads COMMENTS_FILE, a JSON array of review comments as returned by
# `GET /repos/{owner}/{repo}/pulls/{number}/comments`. Prints one
# "applied:" or "skipped:" line per suggestion; edits files in place and
# leaves committing to the caller.
set -euo pipefail

comments_file="${COMMENTS_FILE:?COMMENTS_FILE must point to the review comments JSON}"

# One TSV row per suggestion: id, path, start line, end line, then either
# "apply" plus the base64 suggestion text or "skip" plus the reason.
# Only reviewers with write access count, and only while the comment still
# applies to the current head (GitHub nulls `line` once a comment is outdated).
# Rows are sorted bottom-up per file so earlier edits never shift later ones.
rows="$(jq -r '
  ["OWNER", "MEMBER", "COLLABORATOR"] as $trusted
  | map(
      (.body | gsub("\r"; "")) as $body
      | select($body | test("```suggestion\n"))
      | {
          id,
          path,
          end: (.line // 0),
          start: (.start_line // .line // 0),
          text: ($body | capture("```suggestion\n(?<s>[\\s\\S]*?)```").s),
          skip: (
            if (.author_association | IN($trusted[]) | not) then
              "author \(.author_association) has no write access"
            elif .line == null then "outdated"
            else null end
          )
        }
    )
  | sort_by(.path, -.start)
  | .[]
  | [.id, .path, .start, .end]
    + if .skip then ["skip", .skip] else ["apply", (.text | @base64)] end
  | @tsv
' "$comments_file")"

[ -n "$rows" ] || { echo "no suggestions to apply"; exit 0; }

# Lowest line already rewritten in the current file; a range reaching it overlaps.
checkout="$(realpath .)"
current_path=""
floor=0

while IFS=$'\t' read -r id path start end action payload; do
  if [ "$action" = skip ]; then
    echo "skipped: comment $id on $path: $payload"
    continue
  fi
  # Resolve symlinks and `..` so nothing outside the checkout is ever written.
  resolved="$(realpath -e -- "$path" 2>/dev/null || true)"
  if [[ "$resolved" != "$checkout"/* ]] || [ ! -f "$resolved" ]; then
    echo "skipped: comment $id on $path: not a regular file in the checkout"
    continue
  fi
  if [ "$path" != "$current_path" ]; then
    current_path="$path"
    floor=$(( $(wc -l < "$path") + 2 ))
  fi
  if [ "$end" -ge "$floor" ]; then
    echo "skipped: comment $id on $path: overlaps another applied suggestion"
    continue
  fi
  floor="$start"
  tmp="$(mktemp)"
  {
    head -n "$((start - 1))" "$path"
    printf '%s' "$payload" | base64 -d
    tail -n "+$((end + 1))" "$path"
  } > "$tmp"
  cat "$tmp" > "$path"
  rm -f "$tmp"
  echo "applied: $path:$start-$end (comment $id)"
done <<< "$rows"
