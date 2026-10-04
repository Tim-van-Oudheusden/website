# Risk tiers

Every pull request is classified into one of three risk tiers from the paths it
changes. `.github/workflows/tier-classifier.yml` runs `scripts/tier-classify.sh`
on each PR and posts the tier, plus every changed file with its own tier, to the
run's job summary. The classification is informational: it never fails the run,
it tells reviewers how closely to look.

The **highest tier of any changed file wins**, so one workflow edit makes the
whole PR high risk. A path that matches no rule is **medium** — new kinds of
files get a real review until they are classified.

Run it locally against your branch:

```bash
git diff --name-only origin/main...HEAD | scripts/tier-classify.sh
```

## Tier: high

Changes that alter how code is built, shipped, gated, or how agents behave.
A mistake here can bypass every other check or reach production directly.

| Paths                                                              | Why                                  |
| ------------------------------------------------------------------ | ------------------------------------ |
| `.github/**`                                                       | CI gates, review rubric, release job |
| `deploy/**`, `Dockerfile*`, `*/Dockerfile`, `.devcontainer/**`     | Runtime and image configuration      |
| `scripts/**`                                                       | Gate and release tooling             |
| `package.json`, `*/package.json`, `bun.lock`                       | Dependencies (supply chain)          |
| `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**`, `prompts/**`, `.beads/**` | Agent instructions and governance |

Review: a human reviews the full diff line by line. Dependency changes follow
the rules in `AGENTS.md` (approved, exact version, lockfile from `bun install`).
Workflow changes keep PR-supplied fields in `env:`, never inline in `run:`.

## Tier: medium

Application code and anything not otherwise classified: `front-end/`,
`back-end/`, `shared/`, `test/`, `e2e/`, root config such as `tsconfig.json`
and `eslint.config.js`.

Review: the standard rubric in `.github/workflows/review.yml` — TDD evidence,
behaviour-level tests, no weakened tests, quality gates green.

## Tier: low

Prose and static assets that do not execute: `content/`, `docs/`, `research/`,
`public/`, and Markdown files outside the high-risk paths.

Review: a read-through for accuracy; for `content/`, confirm no `draft: true`
is left on anything meant for release.

## Changing the tiers

The rules live in the `rank` function of `scripts/tier-classify.sh` and are
covered by `test/shared/src/tier-classifier-script.test.ts`. Update the script,
its tests, and this document together; a change to them is itself high risk.
