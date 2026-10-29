# Metrics

The repository's public metrics: what is measured about the codebase and the
work landing in it (agent-authored and otherwise), where each number is
published, and how to reproduce it locally. Every metric here comes from a
script or workflow already in the repo — nothing is collected from site
visitors.

Results are published as GitHub Actions **job summaries** (open the workflow
run on the Actions tab) and, where noted, as a downloadable **run artifact**.
Thresholds that gate merges live in version control so changes to them are
reviewed like code.

## Catalog

| Metric | Measures | Source | Cadence | Published as |
| --- | --- | --- | --- | --- |
| [Quality gates](#quality-gates) | Pass/fail of lint, typecheck, unit tests, build | `scripts/quality-report.sh` via `quality-report.yml` | Push to `main`, weekly (Mon 06:17 UTC), manual | Job summary + `quality-report` artifact |
| [Unit-test coverage](#unit-test-coverage) | Function and line coverage per workspace | `scripts/quality-report.sh` via `quality-report.yml` | Same as above | Job summary + `quality-report` artifact |
| [Coverage floors](#coverage-floors) | Minimum coverage each workspace must keep | `.github/auto-qa-tuning.json`, enforced by `coverage-gate.yml` | Every PR and push to `main` | Check result; proposed floors as `auto-qa-tuning` artifact |
| [PR acceptance rate](#pr-acceptance-rate) | Merged vs. closed-unmerged PRs, agent vs. other | `pr-metrics.yml` | Weekly (Mon 06:17 UTC), manual | Job summary |
| [Nightly compliance](#nightly-compliance) | Dependency advisories, draft-content leaks, lockfile drift | `scripts/nightly-compliance.sh` via `nightly-compliance.yml` | Nightly (03:23 UTC), manual | Job summary + `nightly-compliance` artifact; a failure on `main` opens or comments on the **Nightly compliance failing** issue (`auto-issues.yml`) |
| [Risk tier](#risk-tier) | Review risk of each PR from the paths it changes | `scripts/tier-classify.sh` via `tier-classifier.yml` | Every PR | Job summary |
| [Mutation score](#mutation-score) | Share of mutants the unit tests kill, per workspace | StrykerJS (`stryker/<workspace>.conf.mjs`) and `scripts/mutation-summary.ts` via `mutation-testing.yml` | Nightly (02:47 UTC), manual | Job summary + `mutation-<workspace>` artifact |
| [Strategy report](#strategy-report) | Issue and PR flow, open backlog per pipeline stage, ACMM gaps per level | `scripts/strategy-report.ts` via `strategy-report.yml` | Weekly (Mon 06:17 UTC), manual | Job summary |

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
merged vs. closed without merging. Split by head branch: `claude/*` counts as
agent-authored, everything else as other. A falling agent acceptance rate is
the signal to revisit agent instructions or skills.

Run it with a different window from the Actions tab (**PR metrics → Run
workflow → days**).

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

## Adding a metric

1. Compute it in a script under `scripts/` (Markdown to stdout, diagnostics to
   stderr) so it runs the same locally and in CI.
2. Publish it from a workflow to the job summary, plus an artifact if it is
   worth downloading.
3. Add a row to the catalog above and a section describing what it measures
   and how to reproduce it.
