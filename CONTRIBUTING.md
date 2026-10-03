# Contributing

Thanks for helping out. This guide covers how to get set up, find work, and ship changes through review.

Stack: TypeScript throughout, Bun as the package manager/runtime, Fastify back-end, React + Vite front-end, Podman for local development and E2E tests.

## Getting started

The dev stack runs as a two-container Podman pod via `podman kube play` (no docker-compose):

```bash
scripts/dev.sh        # build dev images + deploy pod + follow logs
scripts/dev-down.sh   # tear the dev pod down
```

The pod publishes:

- Front-end (Vite dev server, HMR): <http://localhost:5173>
- Back-end (Fastify): <http://localhost:3001> — `/health` at the root

Host source is bind-mounted, so edits hot-reload without a rebuild. In containers, the back-end needs `HOST=0.0.0.0`; local host runs default to `127.0.0.1` (see `README.md`).

Dependencies are managed with Bun and pinned in `bun.lock`. Install with `bun install`.

## Finding and claiming work

- GitHub issues are the **primary source of truth** for issue information. Browse open issues, and claim/assign one you intend to work on.
- Issues are also mirrored into the local `bd` (beads) tracker; run `bd ready` to see available work. When closing an issue, close it on GitHub and run `bd github sync` to mirror state back.

We favour small, focused changes tied to a tracked issue.

## Development workflow

1. Create a branch off `main`.
2. Pick an issue, and work it **test-first** (see below).
3. Commit early and often, with [Conventional Commits][conventional-commits] messages, e.g. `feat(home): add contact form`, `fix(deps): tighten route`, `docs(agents): clarify e2e flow`.
4. Open a pull request; fill in the PR template (which links the issue and pastes evidence).

[conventional-commits]: https://www.conventionalcommits.org/

### Test-driven development

We require TDD. One test at a time:

1. Write a failing test for the behaviour you're adding or fixing.
2. Confirm it fails for the expected reason.
3. Make it pass with the smallest change.
4. Refactor only as needed.

Assert on observable outputs, return values, and side effects — never on internal state or private methods. Tests that break under refactoring (without a behaviour change) are wrong. Never weaken or skip a failing test to make it pass; fix the implementation.

## Quality gates

Run these before opening a PR:

| Command               | What it runs                              |
| --------------------- | ----------------------------------------- |
| `bun test`            | Full unit test suite (all workspaces)     |
| `bun run typecheck`   | TypeScript across shared, root, and both apps |
| `bun run lint`        | ESLint (`eslint .`)                       |
| `bun run build`       | Production builds for both apps           |

End-to-end tests run against the Podman pod. `scripts/e2e.sh` mirrors the CI E2E job (build dev images, `podman kube play`, wait for services, `bun run test:e2e`, tear down):

```bash
scripts/e2e.sh
scripts/prod-assets.sh   # prod front-end image serves every public/ file (#480)
```

See [`docs/testing.md`](docs/testing.md) for prerequisites and why the agent sandbox runs only the non-container gates.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and build on every PR, plus an E2E job on the dev pod, a `prod-assets` job on the prod front-end image, and a release job on `main` that waits for all three.

## Code style

Enforced by ESLint (`eslint.config.js`) with strict TypeScript rules and `@stylistic`. Notable conventions:

- Semicolons required (`always`).
- `no-explicit-any` is an error — type things properly.
- Explicit return types on functions (warnings; keep them clean).
- Unused vars are warnings; prefix deliberately-unused args with `_`.

Run `bun run lint` and `bun run typecheck` frequently rather than at the end.

## Content authoring

Markdown content lives in `content/` and is authored in Obsidian. See the "Obsidian Content Authoring" section of `README.md` for the required settings (attachment folder `content/images`, relative-path links, wikilinks off). Canonical image syntax:

```md
![Tracking pixel](/content-assets/images/pixel.gif)
```

Image routes are served by the back-end and map to files in `content/images`.

## Dependencies

- Ask before installing, upgrading, or removing a package; state the package name, version, and rationale.
- Always pin an explicit version and match the range style already in use (`bun.lock` should only change via the package manager).
- Prefer standard-library / Web APIs and existing dependencies over new packages.

## Agent safety layers

AI agents working in this repo are bounded by several layers, each catching what the one before misses:

1. **Instructions** — `AGENTS.md` (authoritative) and `CLAUDE.md` state the rules: TDD, ask before dependency changes, never edit `bun.lock` by hand.
2. **Project permissions** — `.claude/settings.json` (committed) enforces those rules for Claude Code: quality-gate commands are pre-approved, dependency and history-rewriting commands need confirmation, and reading `.env*` / credential files, hand-editing `bun.lock`, force-pushes, `--no-verify` commits, and `--force` / `--legacy-peer-deps` installs are denied.
3. **Personal overrides** — `.claude/settings.local.json` (gitignored) for per-developer additions. Deny rules from the project file still apply.
4. **Structural gates** — the quality gates above and CI (`.github/workflows/`) must pass before merge, regardless of who wrote the change.

## Release notes

Deployment details (server bootstrap, pod manifests, image publishing) live in `docs/deploy.md` and `README.md`; keep them in sync when you change infrastructure.