---
name: github-issue-flow
description: Complete one GitHub issue end-to-end: claim, branch, implement with TDD, open a pull request. Use when starting or finishing issue-tracked work in this repository.
---

# GitHub Issue Flow

Single-issue loop for `website`. AGENTS.md is authoritative; this skill encodes
its workflow into concrete commands.

## 1. Start an issue

1. `gh issue list -S "is:open"` to find work. Pick one issue;
   prefer lowest number unless dependencies say otherwise (child issues wait
   for parents).
2. Read the full body: `gh issue view <number>`.
3. Claim it: `gh issue edit <number> --add-assignee @me`.
4. Branch off an up-to-date `main`:
   `git switch main && git pull --rebase && git switch -c <type>/<number>-<slug>`
   (e.g. `docs/639-pr-based-landing`).

## 2. Implement

- Follow repo TDD: one failing test first, confirm it fails for the right
  reason, implement, run the test, then the full suite.
- Gates before finishing: `bun run test`, `bun run typecheck`, `bun run lint`,
  `bun run build`.
- Conventional Commit per issue, referencing the number: `git commit -m
  "type(scope): summary (#<number>)"`.

## 3. Finish the issue

`main` is protected: it only changes through merged pull requests whose
required checks pass, so the issue branch is what you push.

1. Push: `git push -u origin HEAD`.
2. Open the PR, following `.github/pull_request_template.md`:
   `gh pr create --title "type(scope): summary (#<number>)" --body-file <file>`.
   The body says `Fixes #<number>`; the `PR review rubric` check fails without
   that link or a Conventional Commits title.
3. Confirm `git status` shows up to date with `origin/<branch>`, and hand off
   the PR URL. The issue is done when the PR is open with CI running; the
   merge queue (or the maintainer, for high-risk or `hold` PRs) merges it, and
   the merge closes the issue.