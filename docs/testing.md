# Testing

| Command                         | What it runs                                          | Needs podman |
| ------------------------------- | ----------------------------------------------------- | ------------ |
| `bun run test`                  | Unit tests (all workspaces)                           | no           |
| `bun run typecheck`             | TypeScript across shared, root, and both apps         | no           |
| `bun run lint`                  | ESLint (`eslint .`)                                   | no           |
| `bun run build`                 | Production builds for both apps                       | no           |
| `scripts/e2e.sh`                | Playwright E2E suite against the dev pod              | yes          |
| `scripts/prod-assets.sh`        | Prod front-end image serves every `public/` file      | yes          |
| `scripts/quality-report.sh`     | Markdown report of all gates + coverage per workspace | no           |
| `scripts/nightly-compliance.sh` | Markdown report of dependency audit + draft guard     | no           |
| `bun scripts/auto-qa-tuner.ts` | Propose ratcheted coverage floors from a quality report | no           |
| `bun x stryker run stryker/<workspace>.conf.mjs` | Mutation testing of one workspace (StrykerJS) | no |
| `bun run screenshots:readme`    | README screenshots + social preview from the dev pod | yes          |

## Quality report

`.github/workflows/quality-report.yml` runs `scripts/quality-report.sh` on every
push to `main`, weekly (Monday 06:17 UTC), and on demand (`workflow_dispatch`).
The report lists pass/fail for `lint`, `typecheck`, `test`, and `build`, plus
the overall function and line coverage for `back-end`, `shared`, and
`front-end`. It is published as the run's job summary and as the
`quality-report` artifact. Every gate runs even if an earlier one fails, and the
job fails if any gate or coverage run failed. The coverage floors are still
enforced only by `coverage-gate.yml`.

Run it locally with `scripts/quality-report.sh > quality-report.md`. Gate output
goes to stderr and the report to stdout.

## Nightly compliance

`.github/workflows/nightly-compliance.yml` runs nightly (03:23 UTC) and on
demand (`workflow_dispatch`) to catch problems that appear without a code
change:

- **Lockfile drift** — `bun install --frozen-lockfile` fails if `bun.lock` no
  longer matches `package.json`.
- **Dependency audit** — `bun audit --audit-level=high` fails on any high or
  critical advisory in the locked dependency tree. Advisories with no patched
  release upstream are listed in `AUDIT_IGNORE` in the script, each with the
  reason it can't be fixed; remove an entry once a fix ships.
- **Draft leak guard** — fails if any file in `content/` has `draft: true`
  front matter, with or without a trailing `# comment`, the same rule the
  `release` job in `ci.yml` enforces.

`scripts/nightly-compliance.sh` writes the report, published as the run's job
summary and as the `nightly-compliance` artifact. Every check runs even if an
earlier one fails, and the job fails if any check failed. Run it locally with
`scripts/nightly-compliance.sh > nightly-compliance.md`.

## Coverage floor self-tuning

The per-workspace coverage floors that `coverage-gate.yml` enforces live in
`.github/auto-qa-tuning.json` (`floors.<workspace>.functions` / `.lines`, in
percent), next to a `margin` in percentage points.

`scripts/auto-qa-tuner.ts` reads that config and a quality report and proposes,
for each floor, the observed coverage minus `margin`, rounded down to a whole
percent. Floors only ratchet up: a drop in coverage never lowers one, and a
workspace with no coverage in the report (`n/a`) keeps its floors.

The quality-report workflow runs the tuner after every report, appends its
proposal table to the job summary, and uploads the tuned config as the
`auto-qa-tuning` artifact. Nothing is committed automatically: to adopt the
proposal, download the artifact over `.github/auto-qa-tuning.json`, or run it
locally and commit the result:

```bash
scripts/quality-report.sh > quality-report.md
bun scripts/auto-qa-tuner.ts --report quality-report.md          # preview
bun scripts/auto-qa-tuner.ts --report quality-report.md --write  # apply
```

## Mutation testing

Line and branch coverage only say a branch ran. Mutation testing checks that
some assertion depends on it: change the code a little (a *mutant*) and see
whether a test fails. When nothing fails, the mutant *survived*, which marks a
branch the tests run but never assert. #895, #924 and #939 were each such a
branch, all at 100% line coverage.

### TypeScript: StrykerJS, nightly and report-only

`.github/workflows/mutation-testing.yml` runs [StrykerJS](https://stryker-mutator.io/)
nightly (02:47 UTC) and on demand (`workflow_dispatch`), one job per workspace.
Each job publishes a score table (`scripts/mutation-summary.ts`) as its job
summary and uploads the HTML and JSON reports as the `mutation-<workspace>`
artifact. Open the HTML report to see each survivor in place. No job fails on
the score. Once there is a baseline, the score can get a floor that ratchets
like the [coverage floors](#coverage-floor-self-tuning).

The configs live in `stryker/<workspace>.conf.mjs`. Each spreads the settings
all three share from `stryker/base.mjs` and adds only its own files to mutate,
test command and report file names:

| Workspace   | Mutates                                                        | Tests run per mutant                                                                  |
| ----------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `back-end`  | `back-end/src/**`                                              | back-end suite                                                                        |
| `front-end` | `front-end/src/**` and `front-end/server/**`, not `components/ui/` | front-end suite                                                                   |
| `shared`    | `shared/src/**`                                                | back-end and front-end suites, plus the `test/shared` files that import `shared/src` |

Stryker has no Bun test runner, so the configs use its `command` runner: every
mutant runs the whole suite and is killed when the command exits non-zero.
Locally on 2 cores (October 2026), the back-end's 1486 mutants took 21
minutes and the shared workspace's 60 took 3; the front-end has about 3200
mutants at roughly 4 s each, so expect around an hour on a 4-core runner. The
`shared` job leaves out the rest of `test/shared` because those tests check
repository tooling, and some of them (the typecheck run, for one) fail on any
instrumented source.

The configs set `inPlace: true`: tests import sources by relative path and
through the `shared` workspace link, which a sandbox copy would not follow.
Stryker therefore rewrites the real files during a run and restores them from
`.stryker-tmp/` at the end. Commit or stash your changes first, and do not edit
sources while it runs. A run killed before it can clean up (`SIGKILL`, or
piping its output into `head`) leaves instrumented sources behind; restore
them with `git checkout -- <workspace>/` and delete `.stryker-tmp/`. To try
one file:

```bash
bun x stryker run stryker/front-end.conf.mjs --mutate front-end/server/handler.ts
bun scripts/mutation-summary.ts reports/mutation/front-end.json
```

Stryker's process cleanup calls `ps`, so the host needs procps (CI runners
have it).

### Shell: a table of hand mutants

No mutation tool fits the shell scripts (`deploy/systemd/*.sh`, `scripts/*.sh`).
Instead, `test/shared/src/shell-mutants.test.ts` holds a table of hand mutants,
and runs with the rest of `bun run test`. Each row gives a script, a string in
it, its replacement, and the test file that must fail once the replacement is
made. For each row the test builds a throwaway copy of the repository (real
copies of the script and test file, symlinks for everything else), applies
the mutant there, and runs the test file. The checkout itself is never
written to. The row fails when:

- the test file still passes: the mutant survived, so a branch is unasserted;
- the string no longer occurs exactly once: the script changed under the row,
  so update the row.

When a hand mutation run finds a survivor, write the test that kills it, then
add the mutant as a row so a later change to that test can't quietly drop it.

## Run the E2E suite locally

`scripts/e2e.sh` reproduces the `e2e` job in `.github/workflows/ci.yml` step for
step, so a local run exercises the same path CI does:

1. `podman build … --target dev` for the front-end and back-end images
2. `podman kube play deploy/kube/dev.yaml`
3. poll `http://localhost:3001/health` and `http://localhost:5173/` (60 × 5 s,
   each request capped at 5 s by `curl --max-time`, see `E2E_CURL_MAX_TIME`
   below); on timeout, dump `podman pod logs website` and fail
4. `bun run test:e2e`
5. `podman kube down deploy/kube/dev.yaml` — always, even when a step fails

The script exits with the status of the first failing step.

### Prerequisites

- **Podman** (rootless is fine) on the host. CI uses the podman preinstalled
  on `ubuntu-latest` and falls back to `apt-get install -y podman` (with apt
  retries and 30 s request timeouts) only when the image lacks it.
- Ports `5173` and `3001` free, and no `website` pod already running
  (`scripts/dev-down.sh` stops one left over from `scripts/dev.sh`).
- Run from a full checkout: `deploy/kube/dev.yaml` bind-mounts `./front-end`,
  `./back-end`, `./shared`, `./content`, `./public`, `./package.json`, and
  `./bun.lock` as `hostPath` volumes.
- SELinux hosts (Fedora, Silverblue): `podman kube play` does not relabel
  `hostPath` mounts, so `dev.yaml` sets
  `io.podman.annotations.label/<container>: disable` for both containers (#500);
  no `chcon` of the checkout is needed.
- Same setup steps CI runs before the job:

  ```bash
  bun install --frozen-lockfile
  bunx playwright install --with-deps chromium
  ```

### Tuning

| Variable            | Default | Meaning                                   |
| ------------------- | ------- | ----------------------------------------- |
| `E2E_WAIT_ATTEMPTS` | `60`    | Readiness polls before giving up          |
| `E2E_WAIT_INTERVAL` | `5`     | Seconds between readiness polls           |
| `E2E_CURL_MAX_TIME` | `5`     | Seconds each readiness request may take   |

For iterating on a single spec, keep the pod up with `scripts/dev.sh` in one
terminal and run `bun run test:e2e -- e2e/<spec>.e2e.ts` (or
`bun run test:e2e:headed`) in another; `scripts/dev-down.sh` when done.

### Back-end rate limit

The back-end allows 50 requests a minute per visitor, and 10 a minute to
unknown routes (`back-end/src/core/rate-limit.ts`). Behind the dev proxy every
request reaches it from loopback, where the limiter keys on
`cf-connecting-ip`. Specs import `test` from `e2e/fixtures.ts`, which sends a
per-test address from `2001:db8::/32` (RFC 3849), so each test is its own
visitor with its own budget, as each visitor behind Cloudflare is in
production. ESLint rejects importing `test` from `@playwright/test` anywhere
else in `e2e/`. A test that overspends gets the `429`s itself; no other spec
does. Before #716 the whole suite shared the loopback budget: 42 of the 50
requests in one run.

The headroom is per test: 50 minus that test's back-end requests. To measure
it, bring the pod up with `scripts/dev.sh` and run:

```bash
backend_requests() {
  podman logs website-back-end 2>&1 \
    | grep '"msg":"incoming request"' | grep -vc '"url":"/health"'
}
before=$(backend_requests)
bun run test:e2e -- --retries=0 e2e/<spec>.e2e.ts:<line>   # no arguments: whole run
echo $(( $(backend_requests) - before ))
```

Excluding `/health` drops the liveness probe and the readiness polls. On
`main` (October 2026) a whole run sends 54 requests, and the most any one test
sends is 7 (`article-view-beacon.e2e.ts:28`), leaving 43 of headroom.

## Check the prod front-end image's static assets

The dev pod bind-mounts `./public`, so the E2E suite cannot tell whether the
**prod** front-end image ships it. When a file is missing, the prod server
answers with `index.html` and a 200 (SPA fallback), so every image breaks
silently (#480).
`scripts/prod-assets.sh` (CI job `prod-assets`, which `release` waits for)
covers that gap:

1. `podman build -f front-end/Dockerfile --target prod`
2. run the image on `127.0.0.1:${PROD_ASSETS_PORT:-18300}` and poll `/` until
   it answers (`PROD_ASSETS_WAIT_ATTEMPTS` × `PROD_ASSETS_WAIT_INTERVAL`,
   default 30 × 1 s); on timeout, dump `podman logs` and fail
3. fetch every non-dotfile under `public/` and require it to be byte-identical
   to the file in the repo

   Every request in steps 2 and 3 is capped by `curl --max-time`
   (`PROD_ASSETS_CURL_MAX_TIME`, default 10 s), so a server that accepts but
   never answers fails the run instead of hanging it.
4. remove the container, always

## Regenerate the README screenshots

The README's light/dark home-page screenshots and the repo's social preview
(`docs/assets/readme/`) come from `scripts/readme-screenshots.ts`. It runs
manually only (no CI job); rerun it when the home page changes visibly and
commit the PNGs.

```bash
scripts/dev.sh                 # dev pod up first (other terminal)
bun run screenshots:readme     # writes the three PNGs
scripts/dev-down.sh
```

| Output                                  | Theme   | Viewport |
| --------------------------------------- | ------- | -------- |
| `docs/assets/readme/home-light.png`     | `light` | 1280×800 |
| `docs/assets/readme/home-dark.png`      | `dark`  | 1280×800 |
| `docs/assets/readme/social-preview.png` | `light` | 1280×640 |

The captures are defined in `scripts/readme-screenshot-plan.ts`. For each one
the script pins `localStorage.theme`, reloads, waits for the network and fonts
to settle, and screenshots with animations disabled. It targets
`E2E_BASE_URL` (default `http://localhost:5173`) and exits non-zero when that
cannot be reached. It needs the Playwright Chromium build from
[Prerequisites](#prerequisites) (`bunx playwright install chromium`). The
social preview is uploaded by hand under Settings → General → Social preview;
GitHub has no API for it.

## Agent sandbox: what runs where

**Decision:** the agent sandbox (`Dockerfile.sandbox`) runs the non-container
gates only — `bun run test`, `bun run typecheck`, `bun run lint`, and
`bun run build`. The E2E suite runs on a podman-capable host (a developer
machine via `scripts/e2e.sh`, or the CI `e2e` job).

Why: `Dockerfile.sandbox` ships no podman or docker binary, and running rootless
podman inside it would need nested-container support (user namespaces, a
`fuse-overlayfs`/`vfs` storage driver, and relaxed seccomp/`/dev/fuse` access on
the outer container). That widens the sandbox's privileges, which is the opposite
of what the sandbox is for. The dev pod's `hostPath` mounts and published ports
also assume a real host.

If in-sandbox E2E becomes a requirement, track it as a separate issue for a
podman-capable runner image rather than adding podman to `Dockerfile.sandbox`.

Inspecting CI results from the sandbox (the GitHub Actions API returning 403) is
a token-scope problem, not a repository change; it is tracked in #1.
