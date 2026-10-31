#!/usr/bin/env bash
# Fail when a content file still has `draft: true` front matter.
#
# Usage:
#   scripts/draft-leak-guard.sh <content-dir>
#
# Lists every file under <content-dir> with a line the front-matter parser
# (back-end/src/features/content/frontmatter.ts) reads as `draft: true`, and
# exits 1 if there is one. The release job in .github/workflows/ci.yml and
# scripts/nightly-compliance.sh both run this, so the rule lives only here.
set -uo pipefail

content_dir="${1:?usage: draft-leak-guard.sh <content-dir>}"

# Like the parser, allow a ` # comment` after the value: `draft: true # wip`
# is still a draft. `true#wip` (no space before #) is a string there, so not one here.
# The parser also reads an indented ` draft: true` as the top-level key, so allow an indent.
if grep -RIlE '^[[:space:]]*draft:[[:space:]]*true([[:space:]]+(#.*)?)?$' "$content_dir"; then
  exit 1
fi
