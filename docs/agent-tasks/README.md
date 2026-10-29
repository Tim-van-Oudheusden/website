# Agent task traceability

Every change an agent makes has to trace back to the GitHub issue that asked
for it, and every issue has to lead forward to the change that resolved it.
GitHub issues are the task records. This directory does not copy them: it
describes the chain of links that connects an issue to the code on `main`,
which of those links are enforced, and how to follow the chain in either
direction. The coordination rules behind it are in
[`../multi-agent.md`](../multi-agent.md).

## The chain

| Link | Carries the issue number as | Example | Enforced by |
| --- | --- | --- | --- |
| Issue | The task itself, filed by a person, an agent or a workflow; Hive's issues end with `— hive: agent=<name>` | #968 | — |
| Claim | Assignee, or Hive's `hive/claimed-by-<agent>` label | `gh issue edit 968 --add-assignee @me` | Convention ([`multi-agent.md`](../multi-agent.md#the-hand-off-loop)) |
| Branch | `<type>/<N>-<slug>` for local agents; `claude/issue-<N>-<timestamp>` for Claude Code in CI | `ci/968-strategy-report` | Convention |
| Commit | `(#<N>)` at the end of the Conventional Commits subject | `ci: add weekly strategy report dashboard (#968)` | Convention |
| Pull request | `Fixes #<N>` in the body (or `Closes`, `Resolves`, `Refs`); Hive's PRs also end with `— hive: agent=<name> … model=<model>` | #970 | `PR review rubric` check (`scripts/pr-review-check.sh`), required on `main` |
| Merge | Merge commit `Merge pull request #<PR> from <owner>/<branch>`, written by the merge queue or the maintainer | `b96a92b` | `main` only changes through merged PRs |
| Close | The merge closes the issue through `Fixes #<N>`: GitHub does it when the maintainer merges, `scripts/merge-queue.sh land` when the merge queue does (a `GITHUB_TOKEN` merge closes nothing) | #968 closed by #970 | GitHub, or the merge queue |

The required rubric check is what guarantees the chain: a PR into `main`
cannot merge without an issue link. Branch names and commit subjects carry the
number by convention, which makes them quicker to search but not authoritative.
`Refs #<N>` satisfies the rubric without closing the issue. Use it when a PR
covers only part of the issue.

**Exempt:** PRs opened by bot accounts (`*[bot]`, in practice Dependabot) need
no issue link. Their task is the dependency update itself, and the branch
`dependabot/<ecosystem>/<package>` names it.

## Following the chain

From an issue to the change that resolved it:

```bash
gh issue view <N> --json state,assignees,labels,closedByPullRequestsReferences
gh pr list --state all --search "<N>"
git log --oneline --grep "(#<N>)" origin/main
```

From a line of code back to its issue:

```bash
git blame -L <line>,<line> <file>    # the commit
git log -1 --format=%s <commit>      # subject ends in (#<N>)
gh pr list --state merged --search "<commit>"   # the PR, whose body links the issue
```

From an agent to everything it did: filter PRs by author or branch, e.g.
`gh pr list --state all --author app/hive-forge-app` for Hive,
`gh pr list --state all --search "head:claude/"` for Claude Code in CI. Hive's
`— hive: agent=<name>` signature line in each PR body names the Hive agent.

## When the chain breaks

- **Work with no issue**: file one (`gh issue create`) before opening the PR.
  An agent that finds work outside its issue files a new issue rather than
  widening the PR.
- **A PR that links the wrong issue**: edit the body. The rubric check runs
  again on edit.
- **An issue closed with no linked PR**: reopen it, or comment with the PR or
  commit that resolved it so the record is complete.
