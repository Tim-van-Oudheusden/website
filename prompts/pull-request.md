# Pull Request Prompt

Create a PR body for `<ISSUE>` (title: `<TITLE>`) implemented by commits
`<COMMIT_RANGE>` in `website`.

Rules: Conventional Commits, one commit per issue, issue referenced in commits.

Template:

## What

- One line: what changes for the user.

## Why

- Reference the issue's goal; note any verified deviations from the ticket
  (stale premises, review-driven changes).

## How to verify

- The exact commands run and their results (e.g. `bun run test`: front-end
  N / back-end M / shared K pass; typecheck/lint clean).
- Anything a reviewer should smoke-test manually (UI paths, e2e).

## Notes

- Documented tradeoffs, harness limitations, or pre-existing issues touched.