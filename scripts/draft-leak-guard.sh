#!/usr/bin/env bash
# Fail when a content file still has `draft: true` front matter.
#
# Usage:
#   scripts/draft-leak-guard.sh <content-dir>
#
# Lists every file under <content-dir> with a line the front-matter parser
# (back-end/src/features/content/frontmatter.ts) reads as `draft: true`, and
# exits 1 if there is one. It exits 2 if it cannot read <content-dir> or a file
# under it, even after listing a draft: "could not check" is not a pass.
# The release job in .github/workflows/ci.yml and scripts/nightly-compliance.sh
# both run this, so the rule lives only here.
set -uo pipefail

content_dir="${1:?usage: draft-leak-guard.sh <content-dir>}"

# Like the parser, allow a ` # comment` after the value: `draft: true # wip`
# is still a draft. `true#wip` (no space before #) is a string there, so not one here.
# The parser reads `True` and `TRUE` as true too, as YAML does (#1036).
# The parser also reads an indented ` draft: true` as the top-level key, so allow an indent.
# As in YAML, `True` and `TRUE` are the boolean too; `tRue` is a string.
# GNU grep exits 2 on a read error even when it also found a match, so map its
# three exit codes instead of treating every non-zero one as "no draft".
grep -RIlE '^[[:space:]]*draft:[[:space:]]*(true|True|TRUE)([[:space:]]+(#.*)?)?$' "$content_dir"
case $? in
  0) exit 1 ;; # a draft line was found
  1) exit 0 ;; # no draft line
  *)
    echo "draft-leak-guard: could not read all of $content_dir" >&2
    exit 2
    ;;
esac
