# AI operations runbook

How to watch the agents working in this repository and how to debug them when
they misbehave. [`multi-agent.md`](multi-agent.md) is the coordination contract
that says what each agent is supposed to do. [`metrics/`](metrics/README.md)
catalogues what is measured, and
[`security/SECURITY-AI.md`](security/SECURITY-AI.md) covers trust boundaries.
This page covers the day-to-day work: where to look, what a healthy state looks
like, and what to do when something is stuck.

There is no alerting backend. Every signal below is a GitHub Actions run, a
label or an issue, and you read it with `gh` or on the Actions tab. The one
exception is a failing Nightly compliance run, which files an issue on its own
(`auto-issues.yml`).

## Where to look

| Question | Signal | Command |
| --- | --- | --- |
| What are agents working on? | Open PRs by head branch: `claude/*` (Claude Code in CI), `<agent>/…` or `<type>/<N>-…` (Hive, local agents), `dependabot/*` | `gh pr list --json number,title,headRefName,author,labels` |
| Who holds an issue? | Assignee, or the `hive/claimed-by-<agent>` label | `gh issue view <N> --json assignees,labels` |
| What is queued for Claude Code? | Issues labelled `ai-fix-requested` | `gh issue list --label ai-fix-requested` |
| Did Claude Code run, and how did it end? | `Claude Code` workflow runs | `gh run list --workflow claude.yml` |
| Why is a PR not merging? | Merge queue runs and their `::notice` lines, the `hold` label, the merge state | `gh run list --workflow merge-queue.yml`, `gh pr view <N> --json mergeStateStatus,isDraft,labels` |
| How risky is a PR? | `Change classification` job summary | `git diff -z --name-only --no-renames origin/main...<branch> \| scripts/tier-classify.sh -z` |
| Are agent PRs being accepted? | Weekly `PR metrics` job summary (agent = `claude/*`) | `gh workflow run pr-metrics.yml -f days=28` |
| Is the backlog shrinking? | Weekly `Strategy report` job summary | `gh workflow run strategy-report.yml -f days=28` |
| Is `main` healthy? | `Quality report` (every push to `main`), `Nightly compliance`, `Mutation testing` | `gh run list --branch main --limit 20` |
| Have agents been corrected before? | `.claude/memory/corrections.tsv`, `docs/reflections/` | — |

## Routine checks

- **Every Monday**, after 06:17 UTC: read the PR metrics, strategy report and
  quality report job summaries. Look for three things: an agent acceptance
  rate that keeps falling, a pipeline stage where issues pile up, and a
  coverage floor proposal waiting to be committed.
- **When a PR you own is not merged within a day**, work through
  [A PR does not merge](#a-pr-does-not-merge).
- **When the Nightly compliance failing issue opens**, fix it like any other
  issue. The PR that fixes the check closes it.

## Playbooks

### Claude Code did not pick up an `ai-fix-requested` issue

`gh run list --workflow claude.yml` lists one run for each label event:

- **`skipped`** is expected for every other label put on the issue. Only the
  `ai-fix-requested` event passes the job's `if`. A comment or review only
  passes when it mentions `@claude` and its author is `OWNER`, `MEMBER` or
  `COLLABORATOR`.
- **`failure` with "Workflow initiated by non-human actor"** means a bot added
  the label (Hive files its ACMM issues already labelled). Claude Code's action
  refuses runs started by bots. To hand the issue over, a maintainer removes the
  label and adds it again:
  `gh issue edit <N> --remove-label ai-fix-requested && gh issue edit <N> --add-label ai-fix-requested`.
- **`failure` at "Refuse fork pull requests"**: the PR comes from a fork. Review
  it locally; the workflow never runs fork code.
- **`failure` in "Run Claude Code"** for any other reason: open the log
  (`gh run view <run-id> --log-failed`). An authentication error means the
  `CLAUDE_CODE_OAUTH_TOKEN` secret has expired or is missing.

Before handing an issue to Claude Code, check that no one else holds it (see
[Duplicate work](#two-agents-worked-the-same-issue)).

### A PR does not merge

The merge queue (`merge-queue.yml`, logic in `scripts/merge-queue.sh`) only
picks a PR that meets all of the conditions in
[`multi-agent.md`](multi-agent.md#merge-queue). Check them in order:

1. **Draft or `hold`**: `gh pr view <N> --json isDraft,labels`. Hive sets
   `hold` on its own PRs, and the queue sets it on a PR that failed
   verification.
2. **`sentinel-alert`**: Hive's sentinel flagged the PR as touching sensitive
   files or matching a suspicious pattern, and its comment on the PR names the
   findings. Review the diff against them; only once you are satisfied, remove
   the label (`gh pr edit <N> --remove-label sentinel-alert`), which queues
   the PR again.
3. **Required checks**: `gh pr view <N> --json mergeStateStatus` must be
   `CLEAN`. `BLOCKED` means a required check failed or has not run (CI, Coverage
   gate, PR review rubric), or a review thread is still unresolved. `BEHIND` and
   `DIRTY` mean the branch needs a rebase or a conflict fixed.
4. **High risk**: the queue leaves high-risk PRs for the maintainer and logs
   `#<N> is high risk` as a notice in its run. The tier comes from the path
   rules in [`risk-tiers.md`](risk-tiers.md).
5. **Fork**: the queue never picks a PR from a fork.

If the PR meets every condition and still sits there, no event has started the
queue since it became ready. Drain the queue by hand with
`gh workflow run merge-queue.yml`.

### The merge queue put `hold` on a PR

The queue merged the PR onto the latest `main` and lint, typecheck, unit tests
or build failed on the result. Its comment on the PR links the failed run. Most
often a PR that merged in the meantime conflicts with this one. Rebase on
`main`, fix it, push, then remove the label
(`gh pr edit <N> --remove-label hold`) to queue the PR again.

### `main` shows no CI run after a queued merge

Merges made with `GITHUB_TOKEN` start no push workflows, so after each merge
the queue starts CI, the coverage gate and the quality report on `main` itself.
If those runs are missing, look at the queue's `land` job, then start the runs
by hand:
`for w in ci.yml coverage-gate.yml quality-report.yml; do gh workflow run "$w" --ref main; done`.
The release job in `ci.yml` publishes the image only from a `main` run.

### An issue stayed open after a queued merge

A merge made with `GITHUB_TOKEN` leaves the issues the PR links with
`Fixes #<N>` open, so the queue's `land` job closes them itself. If one is still
open, look at that job, then close it by hand:
`gh issue close <N> --reason completed --comment "Closed by #<PR>."`.
An issue in another repository is never closed by the queue.

### The PR review rubric fails

`scripts/pr-review-check.sh` has two requirements: a Conventional Commits
title, and a body that links the issue (`Fixes #<N>`). Bot authors are exempt
from the link. Edit the PR title or body and the check runs again; no push is
needed.

### Two agents worked the same issue

Agents claim an issue by assigning it, or with Hive's
`hive/claimed-by-<agent>` label (see [the hand-off loop](multi-agent.md#the-hand-off-loop)).
Find the competing PRs with `gh pr list --state all --search "<N>"`, keep the
one that came from the agent holding the claim, and close the other with a
comment linking it. If an agent ignored a claim it could see, record that as
agent misbehaviour (below).

### An agent acted outside its instructions

This covers ignored rules, an injection attempt that got through, and changes
outside the issue's scope. Stop the agent, then follow
[SECURITY-AI.md § Reporting](security/SECURITY-AI.md#reporting): rotate any
exposed secret first, open an issue, and add a line to
`.claude/memory/corrections.tsv` saying where the fix is encoded. If the lesson
needs context, write a reflection in `docs/reflections/`.

### Beads is out of step with GitHub

GitHub is the source of truth. In a non-interactive shell, export the token
first. Then pull only, because a bidirectional sync can hang:

```bash
export GITHUB_TOKEN="$(gh auth token)"
bd github sync --pull-only
```

## Stopping the agents

To pause agent work, for example during an incident or while a bad instruction
gets fixed, stop each entry point:

| Stop | Command | Undo |
| --- | --- | --- |
| Claude Code in CI | `gh workflow disable claude.yml` | `gh workflow enable claude.yml` |
| Automatic merges | `gh workflow disable merge-queue.yml` | `gh workflow enable merge-queue.yml`, then `gh workflow run merge-queue.yml` |
| One PR | `gh pr edit <N> --add-label hold` | `gh pr edit <N> --remove-label hold` |
| Hive | Pause it in Hive's own scheduler; it runs outside this repository | Resume it there |

CI keeps running on every PR either way, so nothing lands on `main` without
passing the gates.

## Production

The site itself runs no AI. For outages, bad deploys and rollbacks see
[`deploy.md`](deploy.md), and write up anything user-visible in
[`postmortems/`](postmortems/README.md).
