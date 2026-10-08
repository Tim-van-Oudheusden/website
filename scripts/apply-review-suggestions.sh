#!/usr/bin/env bash
# Automated review application: apply the ```suggestion blocks of PR review
# comments to the checkout in the current directory.
# Reads COMMENTS_FILE, a JSON array of review comments as returned by
# `GET /repos/{owner}/{repo}/pulls/{number}/comments`. Prints one
# "applied:" or "skipped:" line per suggestion; edits files in place and
# leaves committing to the caller. Needs bash, coreutils and Bun only.
set -euo pipefail

comments_file="${COMMENTS_FILE:?COMMENTS_FILE must point to the review comments JSON}"
# Bun reads bunfig.toml (whose `preload` runs code) and .env from its working
# directory, and the caller's directory is the untrusted PR checkout. Parse from
# an empty directory instead so none of the PR's files can run here.
COMMENTS_FILE="$(realpath -e -- "$comments_file")"
export COMMENTS_FILE
bun_cwd="$(mktemp -d)"
trap 'rm -rf "$bun_cwd"' EXIT

# One TSV row per suggestion: id, path, start line, end line, then either
# "apply" plus the base64 suggestion text or "skip" plus the reason.
# Only reviewers with write access count, and only while the comment still
# applies to the current head (GitHub nulls `line` once a comment is outdated).
# Rows are sorted bottom-up per file so earlier edits never shift later ones.
# Fields are escaped like jq's @tsv so each row stays on one line.
rows="$(cd "$bun_cwd" && bun -e '
  const trusted = ["OWNER", "MEMBER", "COLLABORATOR"];
  const escapes = { "\\": "\\\\", "\t": "\\t", "\n": "\\n", "\r": "\\r" };
  const field = (value) => String(value ?? "").replace(/[\\\t\n\r]/g, (c) => escapes[c]);
  const comments = await Bun.file(process.env.COMMENTS_FILE).json();

  const suggestions = comments.flatMap((c) => {
    const match = /```suggestion\n([\s\S]*?)```/.exec(c.body.replaceAll("\r", ""));
    if (!match) return [];
    const skip = !trusted.includes(c.author_association)
      ? `author ${c.author_association ?? null} has no write access`
      : c.line == null ? "outdated" : null;
    return [{
      id: c.id,
      path: c.path,
      end: c.line ?? 0,
      start: c.start_line ?? c.line ?? 0,
      action: skip ? ["skip", skip] : ["apply", Buffer.from(match[1]).toString("base64")],
    }];
  });

  suggestions.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : b.start - a.start));
  for (const s of suggestions) {
    console.log([s.id, s.path, s.start, s.end, ...s.action].map(field).join("\t"));
  }
')"

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
