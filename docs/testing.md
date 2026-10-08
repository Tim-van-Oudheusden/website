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
  front matter, the same rule the `release` job in `ci.yml` enforces.

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

## Run the E2E suite locally

`scripts/e2e.sh` reproduces the `e2e` job in `.github/workflows/ci.yml` step for
step, so a local run exercises the same path CI does:

1. `podman build … --target dev` for the front-end and back-end images
2. `podman kube play deploy/kube/dev.yaml`
3. poll `http://localhost:3001/health` and `http://localhost:5173/` (60 × 5 s,
   each request capped at 5 s by `curl --max-time`); on timeout, dump
   `podman pod logs website` and fail
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

For iterating on a single spec, keep the pod up with `scripts/dev.sh` in one
terminal and run `bun run test:e2e -- e2e/<spec>.e2e.ts` (or
`bun run test:e2e:headed`) in another; `scripts/dev-down.sh` when done.

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
