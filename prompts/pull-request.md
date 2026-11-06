# Pull Request Prompt

Create a PR body for `<ISSUE>` (title: `<TITLE>`) implemented by commits
`<COMMIT_RANGE>` in `website`.

Rules: Conventional Commits, one commit per issue, issue referenced in commits.

Fill in `.github/pull_request_template.md` and keep all of its sections. The
body must say `Fixes #<ISSUE>`: the `PR review rubric` check fails without an
issue link, and the merge closes the issue through that line.

What to put in them:

- **Summary:** under What, one line on what changes for the user. Under Why, the
  issue's goal and any verified deviations from the ticket (stale premises,
  review-driven changes).
- **Testing:** failing-before and passing-after output for the changed path, and
  the exact commands run with their results (e.g. `bun run test`: front-end
  N / back-end M / shared K pass; typecheck/lint clean).
- **Quality gates:** tick only the gates you ran.
- **Notes for the reviewer:** documented tradeoffs, harness limitations or
  pre-existing issues touched, and anything to smoke-test manually (UI paths,
  e2e).
