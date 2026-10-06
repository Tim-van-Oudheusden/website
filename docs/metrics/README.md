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
| [Nightly compliance](#nightly-compliance) | Dependency advisories, draft-content leaks, lockfile drift | `scripts/nightly-compliance.sh` via `nightly-compliance.yml` | Nightly (03:23 UTC), manual | Job summary + `nightly-compliance` artifact |
| [Risk tier](#risk-tier) | Review risk of each PR from the paths it changes | `scripts/tier-classify.sh` via `tier-classifier.yml` | Every PR | Job summary |

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
git diff --name-only origin/main...HEAD | scripts/tier-classify.sh
```

## Adding a metric

1. Compute it in a script under `scripts/` (Markdown to stdout, diagnostics to
   stderr) so it runs the same locally and in CI.
2. Publish it from a workflow to the job summary, plus an artifact if it is
   worth downloading.
3. Add a row to the catalog above and a section describing what it measures
   and how to reproduce it.
