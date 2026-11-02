# Metrics

The repository's public metrics: what is measured about the codebase and the
work landing in it (agent-authored and otherwise), where each number is
published, and how to reproduce it locally. Every metric here comes from a
script, workflow or back-end route already in the repo — nothing is collected
from site visitors.

Results are published as GitHub Actions **job summaries** (open the workflow
run on the Actions tab) and, where noted, as a downloadable **run artifact**.
The [Agentic tab metrics](#agentic-tab-metrics) are the exception: the site
serves them live.
Thresholds that gate merges live in version control so changes to them are
reviewed like code.

## Catalog

| Metric | Measures | Source | Cadence | Published as |
| --- | --- | --- | --- | --- |
| [Quality gates](#quality-gates) | Pass/fail of lint, typecheck, unit tests, build | `scripts/quality-report.sh` via `quality-report.yml` | Push to `main`, weekly (Mon 06:17 UTC), manual | Job summary + `quality-report` artifact |
| [Unit-test coverage](#unit-test-coverage) | Function and line coverage per workspace | `scripts/quality-report.sh` via `quality-report.yml` | Same as above | Job summary + `quality-report` artifact |
| [Coverage floors](#coverage-floors) | Minimum coverage each workspace must keep | `.github/auto-qa-tuning.json`, enforced by `coverage-gate.yml` | Every PR and push to `main` | Check result; proposed floors as `auto-qa-tuning` artifact |
| [PR acceptance rate](#pr-acceptance-rate) | Merged vs. closed-unmerged PRs per source (Hive, Claude Code in CI, Dependabot, other) | `scripts/pr-metrics.ts` via `pr-metrics.yml` | Weekly (Mon 06:17 UTC), manual | Job summary |
| [Nightly compliance](#nightly-compliance) | Dependency advisories, draft-content leaks, lockfile drift | `scripts/nightly-compliance.sh` via `nightly-compliance.yml` | Nightly (03:23 UTC), manual | Job summary + `nightly-compliance` artifact; a failure on `main` opens or comments on the **Nightly compliance failing** issue (`auto-issues.yml`) |
| [Risk tier](#risk-tier) | Review risk of each PR from the paths it changes | `scripts/tier-classify.sh` via `tier-classifier.yml` | Every PR | Job summary |
| [Mutation score](#mutation-score) | Share of mutants the unit tests kill, per workspace | StrykerJS (`stryker/<workspace>.conf.mjs`) and `scripts/mutation-summary.ts` via `mutation-testing.yml` | Nightly (02:47 UTC), manual | Job summary + `mutation-<workspace>` artifact |
| [Strategy report](#strategy-report) | Issue and PR flow, open backlog per pipeline stage, ACMM gaps per level | `scripts/strategy-report.ts` via `strategy-report.yml` | Weekly (Mon 06:17 UTC), manual | Job summary |
| [AI audit trail](#ai-audit-trail) | Every PR merged into `main`: source (Hive agent and model, Claude Code in CI, Dependabot, other), author, merger | `scripts/ai-audit-report.ts` via `ai-audit.yml` | Weekly (Mon 06:17 UTC, past 7 days), manual | Job summary + `ai-audit` artifact (report and raw PR data, kept 90 days) |
| [Agentic tab metrics](#agentic-tab-metrics) | Live Hive queue, governor mode and agents; contributor-agent tasks and runs; this repo's PR flow and who wrote the merged work | `GET /api/hive/metrics` (`back-end/src/features/hive/`) from Hive's widget summary and contribute endpoints and this repo's public GitHub PRs | Back-end caches 60 s / 180 s, browser polls every 60 s | The `/agentic` page on the live site |

## Quality gates

Runs `bun run lint`, `typecheck`, `test`, and `build` and reports each as
pass/fail. Every gate runs even when an earlier one fails, so one report shows
the full state. The workflow fails if any gate fails.

```bash
scripts/quality-report.sh > quality-report.md
```

## Unit-test coverage

Part of the same report: each workspace (`back-end`, `shared`, `front-end`)
runs its unit tests with Bun's built-in coverage, and the report records the
`All files` function and line percentages. A failing test run reports `n/a`
rather than a misleading number.

## Coverage floors

`.github/auto-qa-tuning.json` holds a function and line floor per workspace.
`coverage-gate.yml` fails a PR that drops a workspace below its floor
(`scripts/coverage-check.sh <workspace> <functions> <lines>`).

The floors ratchet: on each quality-report run, `scripts/auto-qa-tuner.ts`
proposes raising each floor to observed coverage minus the file's `margin`
(floors are never lowered), appends the proposal to the report, and uploads
the tuned file as the `auto-qa-tuning` artifact. Floors change only when that
proposal is committed.

```bash
bun scripts/auto-qa-tuner.ts --report quality-report.md
```

## PR acceptance rate

Of the PRs closed in the reporting window (default 28 days), how many were
merged vs. closed without merging, per source. The source is decided by the
same rule as the [AI audit trail](#ai-audit-trail) (`shared/src/pr-source.ts`):
Hive's signature line in the PR body first, then a `claude/*` or
`dependabot/*` head branch, else other. A falling acceptance rate for an agent
source is the signal to revisit that agent's instructions or skills.

Run it with a different window from the Actions tab (**PR metrics → Run
workflow → days**), or locally:

```bash
since="$(date -u -d '28 days ago' +%Y-%m-%d)"
gh pr list --state closed --limit 1000 --search "closed:>=${since}" \
  --json headRefName,mergedAt,body > prs.json
bun scripts/pr-metrics.ts "$since" prs.json
```

## Nightly compliance

Checks that can go stale without a code change: `bun audit` reports no high or
critical advisories (except those listed in the script's `AUDIT_IGNORE`), no `draft: true` front matter in
`content/`, and a frozen-lockfile install succeeds.

```bash
scripts/nightly-compliance.sh > nightly-compliance.md
```

## Risk tier

Classifies each PR as low, medium, or high risk from its changed paths; the
highest tier of any file wins. Informational only — it never fails the run.
Tiers and the review each expects are defined in
[`docs/risk-tiers.md`](../risk-tiers.md).

```bash
git diff -z --name-only --no-renames origin/main...HEAD | scripts/tier-classify.sh -z
```

## Mutation score

Per workspace, StrykerJS makes small changes to the source (mutants) and runs
the unit tests against each. The score is detected mutants (killed or timed
out) over all mutants the tests could run against; compile and runtime errors
are left out. A survivor is a branch the tests run but never assert, which line
coverage cannot show. Report-only: no job fails on the score, and there is no
floor yet. Details, and the hand-mutant table for shell scripts, are in
[`docs/testing.md`](../testing.md#mutation-testing).

```bash
bun x stryker run stryker/back-end.conf.mjs
bun scripts/mutation-summary.ts reports/mutation/back-end.json
```

## Strategy report

The strategic dashboard: where the project is heading rather than how one
change fared. Three tables:

- **Flow** — issues opened and closed and PRs merged in the reporting window
  (default 28 days), the net change in the backlog, and how many issues are
  open now. A backlog that grows week on week is outrunning the agents working
  it.
- **Backlog by stage** — open issues per `stage/*` label, the pipeline Hive
  moves issues through ([`docs/multi-agent.md`](../multi-agent.md)), in
  pipeline order; open issues with no stage label are counted last. Issues
  piling up in one stage show where work stalls.
- **ACMM progress** — per maturity level, the `acmm` issues the Hive
  evaluation filed (`[ACMM L<level>] Add <criterion>`), closed and still open,
  naming the open ones. It counts only gaps the evaluation filed, not every
  criterion of a level.

Run it with a different window from the Actions tab (**Strategy report → Run
workflow → days**), or locally:

```bash
since="$(date -u -d '28 days ago' +%Y-%m-%d)"
gh issue list --state all --limit 10000 --json number,title,state,labels,createdAt,closedAt > issues.json
gh pr list --state merged --limit 1000 --search "merged:>=${since}" --json mergedAt > prs.json
bun scripts/strategy-report.ts "$since" issues.json prs.json
```

## AI audit trail

A record of what reached `main` and who was behind it. Each PR merged in the
window (default 7 days) is attributed to one source, checked in this order:

- **Hive** — the PR body ends with Hive's signature line
  (`— hive: agent=<name> … model=<model> …`); the agent and model are taken
  from it. Contributor runs sign without `agent=`, shown as `—`.
- **Claude Code (CI)** — head branch `claude/*`.
- **Dependabot** — head branch `dependabot/*`.
- **Other** — anything else: the maintainer, or a local coding agent
  ([`docs/multi-agent.md`](../multi-agent.md)).

The report counts merges per source and per merging account (the merge queue
merges as `app/github-actions`; a merge with no recorded merger is listed last
as unknown), then lists every merge oldest first with its source, agent,
model, author, merger, branch and title. The weekly run covers the past 7
days, so consecutive runs leave no gap. The `ai-audit` artifact keeps the
report and the raw `gh pr list` output for 90 days.

Run it with a different window from the Actions tab (**AI audit trail → Run
workflow → days**), or locally:

```bash
since="$(date -u -d '7 days ago' +%Y-%m-%d)"
gh pr list --state merged --limit 1000 --search "merged:>=${since}" \
  --json number,title,author,headRefName,mergedAt,mergedBy,body > ai-audit-prs.json
bun scripts/ai-audit-report.ts "$since" ai-audit-prs.json
```

## Agentic tab metrics

The live section of the [Agentic tab](https://buildwithtim.dev/agentic): what
Hive is doing on this server right now and how pull requests flow through this
repo. The back-end fetches, caches and trims the data; the browser never talks
to Hive or GitHub. Design:
[`2026-11-02-agentic-hive-metrics-design.md`](../superpowers/specs/2026-11-02-agentic-hive-metrics-design.md);
the research behind it, with every Hive claim cited:
[`research/hive_metrics_api.md`](../../research/hive_metrics_api.md).

Sources, all GET requests to fixed URLs with no visitor input:

- **Hive widget summary** (`/api/widget/summary`) — the queue (issues, PRs,
  held, actionable, mergeable), governor mode and its history, and how many
  agents exist and are running. Read with Hive's read-only widget token
  (`HIVE_WIDGET_TOKEN`), which authenticates that one route and nothing else.
- **Anonymous Hive endpoints** — `/api/health` (online or not),
  `/api/contribute/metrics` (contributor-agent tasks done per hour and fleet
  size, 7 days) and `/api/contribute/run-stats` (runs per backend: completed,
  failed, abandoned, p50 and p95 run time, 7 days).
- **This repo's public GitHub PR list** — PRs opened, merged and closed
  unmerged per day over 7 days, median and p90 time to merge, and merged PRs
  per source. The source is decided by the same rule as the
  [AI audit trail](#ai-audit-trail) (`shared/src/pr-source.ts`), so the split is
  by who wrote the PR, not who merged it.

Refresh: the back-end caches health and the widget summary for 60 s and the
contributor endpoints and GitHub for 180 s; the response carries
`Cache-Control: public, max-age=30`; the page polls every 60 s while the
browser tab is visible. A change in Hive or GitHub reaches a visitor within
150 s (widget data) or 270 s (contributor and GitHub data), always under 5
minutes. Upstream load does not depend on visitor count.

The response `state` is:

- **live** — every part shown was fetched within the last 10 minutes;
- **stale** — some part is older than 10 minutes (a failed upstream call keeps
  its last good value, and the page says when it was measured);
- **unavailable** — nothing has been fetched yet; the page explains instead of
  drawing empty charts.

Each part (Hive, contributor agents, repo PRs) fails on its own: without the
widget token only the Hive part is blank.

Deliberately excluded: the builder copies allowlisted counts, durations, modes
and timestamps into fresh objects, so the response never contains repository
names, agent names, Hive's `hiveId`, GitHub logins (including Hive's
`per_user_*` series), PR titles, bodies or branch names, cost, model ids, or
logs. Endpoints that need Hive's owner token are not called at all.

Check the live response:

```bash
curl -s https://buildwithtim.dev/api/hive/metrics
```

## Adding a metric

1. Compute it in a script under `scripts/` (Markdown to stdout, diagnostics to
   stderr) so it runs the same locally and in CI.
2. Publish it from a workflow to the job summary, plus an artifact if it is
   worth downloading.
3. Add a row to the catalog above and a section describing what it measures
   and how to reproduce it.
