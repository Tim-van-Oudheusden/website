# Multi-agent orchestration

Several agents change this repository at the same time: Hive's agents, Claude
Code in CI, coding agents a maintainer runs locally, and Dependabot. None of
them talks to the others directly. GitHub is the shared coordination layer:
an issue is the unit of work, labels and assignees say who holds it, and a pull
request is the only way into `main`. This page is the contract every agent
follows so their work does not collide. `AGENTS.md` holds the full agent
ruleset; [`docs/security/SECURITY-AI.md`](security/SECURITY-AI.md) covers trust
boundaries and review.

## Agents

| Agent | Started by | Branches | Instructions |
| --- | --- | --- | --- |
| Hive agents (`app/hive-forge-app`), e.g. scanner, architect, quality, craftsman, strategist | Hive's own scheduler, outside this repo | `<type>/…` or `<agent>/…`, e.g. `fix/948-…`, `craftsman/…`, `quality/…` | `AGENTS.md` |
| Claude Code in CI (`.github/workflows/claude.yml`) | The `ai-fix-requested` label, or an `@claude` mention from an `OWNER`/`MEMBER`/`COLLABORATOR` | `claude/*` | `CLAUDE.md`, then `AGENTS.md` |
| Local coding agents (Claude Code, Cursor, Copilot, …) | A maintainer, one session per issue | `<type>/<number>-<slug>` | `AGENTS.md`, plus `CLAUDE.md`, `.cursor/rules/agent-guidance.mdc` or `.github/copilot-instructions.md`; the `github-issue-flow` skill in `.claude/skills/` |
| Dependabot (`.github/dependabot.yml`) | Weekly schedule | `dependabot/*` | — |

Workflows file work too: `.github/workflows/auto-issues.yml` opens (or comments
on) **Nightly compliance failing** when the nightly run fails on `main`, and
Hive files issues labelled `agent/<name>` for what its agents find. Those
issues enter the same loop as any other.

## The hand-off loop

```mermaid
flowchart LR
    file["Issue filed<br/>(person, agent or workflow)"] --> claim["Claimed<br/>assignee or hive/claimed-by-*"]
    claim --> branch["Branch off main<br/>one issue per branch"]
    branch --> pr["Pull request<br/>body says Fixes #N"]
    pr --> checks["Required checks<br/>CI, coverage gate, PR review rubric"]
    checks --> merge["Maintainer merges"]
    merge --> close["Issue closes<br/>bd github sync --pull-only"]
```

1. **Issue first.** Every change starts from a GitHub issue. Work an agent
   finds but does not do becomes a new issue (`gh issue create`), not an
   unrelated change in the current PR.
2. **Claim before working.** A local or CI agent assigns the issue
   (`gh issue edit <number> --add-assignee @me`); Hive adds
   `hive/claimed-by-<agent>`. Before starting, check the issue's assignees and
   labels and `gh pr list --search "<number>"`; skip an issue someone else holds
   or an open PR already covers (`stage/040-covered-by-pr`, `🐝 covered by PR`).
3. **One issue, one branch, one PR.** Pick work with `bd ready` or
   `gh issue list`; a child or follow-up issue waits until its parent lands,
   whatever its number.
4. **Same gates for every author.** CI, the coverage gate, the PR review
   rubric and the risk tier ([`risk-tiers.md`](risk-tiers.md)) run on every
   PR, whoever opened it.
5. **A person merges.** `main` is protected and nothing auto-merges: the
   maintainer merges every PR once its required checks pass. Hive's PRs carry
   the `hold` label until then. Agents never merge their own PRs.

## Labels that carry state

| Label | Set by | Meaning |
| --- | --- | --- |
| `ai-fix-requested` | A triager, or Hive on issues it files | Hand the issue to Claude Code in CI |
| `agent/<name>` | Hive | The Hive agent that filed the issue |
| `hive/claimed-by-<agent>` | Hive | That Hive agent holds the issue |
| `stage/<NNN>-<name>` | Hive | Where the issue or PR is in Hive's pipeline, from `stage/010-actionable` to `stage/100-merge-queue`; the label descriptions on GitHub define each stage |
| `hold` | Hive | Hive-authored PR that waits for the maintainer to merge it |
| `acmm` | Hive | A gap found by Hive's ACMM evaluation |

## Beads

`bd` mirrors GitHub issue state into a local ledger so an agent can see ready
work and dependencies offline. GitHub stays the source of truth: claim and
close issues there, then run `bd github sync --pull-only`. Hive keeps its own
ledgers outside this repository.
