---
name: github-issue-flow
description: Complete one GitHub issue end-to-end: claim, implement with TDD, close, mirror into beads, push. Use when starting or finishing issue-tracked work in this repository.
---

# GitHub Issue Flow

Single-issue loop for `website`. AGENTS.md is authoritative; this skill encodes
its workflow into concrete commands.

## 1. Start an issue

1. `gh issue list -S "is:open"` and `bd ready` to find work. Pick one issue;
   prefer lowest number unless dependencies say otherwise (child issues wait
   for parents).
2. Read the full body: `gh issue view <number>`.
3. Claim it: `gh issue edit <number> --add-assignee @me`.

## 2. Implement

- Follow repo TDD: one failing test first, confirm it fails for the right
  reason, implement, run the test, then the full suite.
- Gates before finishing: `bun run test`, `bun run typecheck`, `bun run lint`,
  `bun run build`.
- Conventional Commit per issue, referencing the number: `git commit -m
  "type(scope): summary (#<number>)"`.

## 3. Finish the issue

1. Comment + close on GitHub:
   `gh issue comment <number> --body "…"`, then
   `gh issue close <number> --reason completed`.
2. Mirror into beads. Non-interactive shells lack the token:
   `export GITHUB_TOKEN="$(gh auth token)"`.
   GitHub-only changes: `export GITHUB_OWNER="Tim-van-Oudheusden" GITHUB_REPO="website"`
   then `bd github sync --pull-only` (a bidirectional sync can hang on this
   device; pull-only is the documented path after GitHub-only changes).
3. Push: `bd dolt push`, then `git pull --rebase && git push`, then confirm
   `git status` shows up to date with origin.

Never make a standalone `issues.jsonl` sync commit; only the repo's own hooks
may stage that export.