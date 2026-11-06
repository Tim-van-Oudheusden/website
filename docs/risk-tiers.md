# Risk tiers

Every pull request is classified into one of three risk tiers from the paths it
changes. `.github/workflows/tier-classifier.yml` runs `scripts/tier-classify.sh`
on each PR and posts the tier, plus every changed file with its own tier, to the
run's job summary. No tier fails the run: the tier tells reviewers how closely
to look, and it decides who merges. A missing or malformed risk assessment, or
one with no rules, does fail the run, because the classifier then exits 2
without a tier. The
[merge queue](multi-agent.md#merge-queue) merges low- and medium-risk PRs once
their required checks pass, and Hive's merge sweep may do the same, so review
them before then or add `hold`. The maintainer merges high-risk PRs after the
review below.

The **highest tier of any changed file wins**, so one workflow edit makes the
whole PR high risk. A path that matches no rule is **medium**, and medium merges
without a human review, so a new kind of file that configures a gate or the
build needs a high rule in the same PR that adds it.

Run it locally against your branch:

```bash
git diff -z --name-only --no-renames origin/main...HEAD | scripts/tier-classify.sh -z
```

`--no-renames` lists a moved or renamed file under its old path as well as its
new one, so moving a workflow out of `.github/workflows/` still counts as a
workflow edit. `-z` passes the paths NUL-terminated and unquoted: without it,
git quotes a name holding non-ASCII, `"`, `\` or a tab, and the quoted path
matches no rule, so it is rated medium whatever its directory.

## Tier: high

Changes that alter how code is built, shipped, gated, or how agents behave.
A mistake here can bypass every other check or reach production directly.

| Paths                                                                                                 | Why                                                 |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `.github/**`                                                                                          | CI gates, review rubric, release job                |
| `deploy/**`, `Dockerfile*`, `*/Dockerfile`, `.devcontainer/**`, `.dockerignore`, `*/vite.config.ts`   | Runtime, image and build configuration              |
| `scripts/**`                                                                                          | Gate and release tooling                            |
| `eslint.config.js`, `.jscpd.json`, `tsconfig*.json`, `bunfig.toml`, `playwright.config.ts`            | What lint, duplication, typecheck and tests enforce |
| `test/shared/src/` tests of the workflows, CODEOWNERS, these rules and the merge queue                | The tests that pin the gates                        |
| `package.json`, `*/package.json`, `bun.lock`                                                          | Dependencies (supply chain)                         |
| `AGENTS.md`, `CLAUDE.md`, `.claude/**`, `.cursor/**`, `prompts/**`                                    | Agent instructions and governance                   |

`tsconfig*.json`, `bunfig.toml` and `*/vite.config.ts` apply at any depth. A gate
passes a change that loosens its own configuration, so these need a person even
though CI stays green. `stryker/` stays medium while the mutation score fails no
job; give it a high rule when that score gets a floor.

Review: a human reviews the full diff line by line. Dependency changes follow
the rules in `AGENTS.md` (approved, exact version, lockfile from `bun install`).
Workflow changes keep PR-supplied fields in `env:`, never inline in `run:`.

`.github/CODEOWNERS` makes the maintainer the owner of exactly these paths, so
a PR that touches one requests his review automatically.
`test/shared/src/codeowners.test.ts` fails if a tracked file is rated high but
has no owner, or has an owner but is not rated high, so a new high-risk rule
needs a matching CODEOWNERS pattern in the same PR.

## Tier: medium

Application code and anything not otherwise classified: `front-end/`,
`back-end/`, `shared/`, `e2e/`, the tests in `test/` other than those rated
high, `stryker/`, and root files such as `.editorconfig`.

Review: the standard rubric in `.github/workflows/review.yml` — TDD evidence,
behaviour-level tests, no weakened tests, quality gates green.

## Tier: low

Prose and static assets that do not execute: `content/`, `docs/`, `research/`,
`public/`, and Markdown files outside the high-risk paths.

Review: a read-through for accuracy; for `content/`, confirm no `draft: true`
is left on anything meant for release.

## Changing the tiers

The rules are policy as code in the risk assessment config,
`.github/risk-assessment.yml`: an ordered `rules:` list of `- <tier> <glob>`
items, one per line, where the **first matching rule wins** — keep high-risk
rules above broad low-risk globs such as `*.md`. `*` matches across `/`.
`scripts/tier-classify.sh` evaluates the rules and fails without a tier if a
line is not a blank line, a whole-line `#` comment, the `rules:` line or such
an item, if an item names an unknown tier, or if the file holds no items at
all (empty, comments only, or a bare `rules:` line), since every path would
then rate medium; set `RISK_TIER_POLICY` to try a different file locally.

The engine and the shipped rules are covered by
`test/shared/src/tier-classifier-script.test.ts`. Update the rules, their
tests, and the tables above in the same PR. The config (`high .github/*`) and
`scripts/tier-classify.sh` (`high scripts/*`) are high risk, and so is the
test; this doc takes its ordinary tier (low).
