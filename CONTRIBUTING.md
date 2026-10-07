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

Host source is bind-mounted, so edits hot-reload without a rebuild. In containers, the back-end needs `HOST=0.0.0.0`; local host runs default to `127.0.0.1` (see the note under "Quick start" in [`README.md`](README.md#quick-start)).

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
| `bun run test`        | Full unit test suite (all workspaces)     |
| `bun run typecheck`   | TypeScript across shared, root, and both apps |
| `bun run lint`        | ESLint, zero warnings (`eslint . --max-warnings 0`) |
| `bun run build`       | Production builds for both apps           |

End-to-end tests run against the Podman pod. `scripts/e2e.sh` mirrors the CI E2E job (build dev images, `podman kube play`, wait for services, `bun run test:e2e`, tear down):

```bash
scripts/e2e.sh
scripts/prod-assets.sh   # prod front-end image serves every public/ file (#480)
```

See [`docs/testing.md`](docs/testing.md) for prerequisites and why the agent sandbox runs only the non-container gates.

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests, and build on every PR, plus an E2E job on the dev pod, a `prod-assets` job on the prod front-end image, and a release job on `main` that waits for all three.

### Applying review suggestions

Comment `/apply-suggestions` on a pull request to have `.github/workflows/auto-review.yml` commit every GitHub ```` ```suggestion ```` block on the PR's current diff (`scripts/apply-review-suggestions.sh`). Only comments from `OWNER`/`MEMBER`/`COLLABORATOR` trigger it or have their suggestions applied; outdated, overlapping, and out-of-checkout suggestions are skipped, and fork PRs are refused. The run reports what it applied and skipped as a PR comment. Its commit is pushed with `GITHUB_TOKEN`, which does not start CI, so CI runs again on your next push.

### Handing work to Claude Code

`.github/workflows/claude.yml` runs [Claude Code](https://github.com/anthropics/claude-code-action) in CI. Label an issue `ai-fix-requested`, or mention `@claude` in an issue comment, PR review, or review comment, and Claude works the request on a `claude/*` branch and opens a pull request; it never pushes to `main`. Mentions only count from `OWNER`/`MEMBER`/`COLLABORATOR`, and the label can only be applied by triagers, so outside commenters cannot start or steer a run. Its PRs go through the same CI and human review as any other. The workflow needs the `CLAUDE_CODE_OAUTH_TOKEN` repo secret and the Claude GitHub App.

## Code style

Enforced by ESLint (`eslint.config.js`): strict type-checked TypeScript rules, with `@stylistic` as the only formatter (no Prettier). `bun run lint` fails on any warning (`--max-warnings 0`); `bun run lint:fix` applies every autofix. Formatting, from `stylistic.configs.customize()` plus overrides:

- 2-space indent, double quotes (single only to avoid escaping), semicolons always.
- Trailing commas on every multiline list (arrays, objects, imports/exports, parameters/arguments, tuples).
- Max line length 120 (strings, URLs, template literals, regexes, and `className` lines exempt); `max-len` has no autofix, so wrap by hand.
- `1tbs` braces, braces required on every block (`curly: all`), no single-line blocks.
- Arrow parameters always parenthesised; wrapped operators lead the next line; wrapped ternaries put each branch on its own line.
- Blank line before and after block statements (`if`, loops, `switch`, `try`, functions, classes) and multiline expressions, after `const`/`let` groups, and before `return`/`break`/`continue`/`throw`.
- Object keys quoted only when one of them must be (`consistent-as-needed`); empty JSX elements self-close.

Code shape:

- Named functions are `function` declarations; arrows only for callbacks and inline expressions (`func-style`, `prefer-arrow-callback`, `arrow-body-style: as-needed`).
- `interface` over `type` where both work; explicit return types on every function (test files exempt).
- Named exports only; default exports are allowed solely in `playwright.config.ts` and `front-end/vite.config.ts`.
- Erasable TypeScript only: no `enum`, `namespace`, or parameter properties (also enforced by `erasableSyntaxOnly`). Use `as const` objects or unions.
- No optional members (`foo?: T`, `foo?(): T`, `fn(x?: T)`); lint bans them via `no-restricted-syntax`. Model complete types instead: required fields, discriminated unions, and required injected dependencies; for serialized data use `T | null`, never `undefined`. See [*Effective TypeScript* Item 37 "Limit the Use of Optional Properties"](https://github.com/danvk/effective-typescript) and ["Parse, don't validate"](https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/). Exempt: shadcn components in `front-end/src/shared/components/ui/` and everything under `test/`. Elsewhere a `?` is allowed only where it mirrors an external signature (e.g. `fetch`'s `init?`) or is a pure DOM `className` passthrough, and only with `// eslint-disable-next-line no-restricted-syntax -- <reason>`.
- Naming: camelCase variables/functions, PascalCase types and components, `UPPER_CASE` allowed for module-level constants, no `I`/`T` prefixes, leading `_` only on unused names.
- `no-explicit-any`, `object-shorthand`, `prefer-template`, `no-else-return`, `no-nested-ternary`, `no-param-reassign` (property mutation allowed), `no-implicit-coercion` (`!!` allowed), `eqeqeq`.

Imports:

- Type-only imports use separate `import type { … }` statements, never inline `{ type X }`.
- Sorted by `eslint-plugin-perfectionist` (natural, case-insensitive), groups separated by a blank line: builtins (`node:`/`bun:`) → packages → `shared` → `@/` → `../` → `./`. Type imports sit in their source's group.
- React APIs are imported by name (`import { useState } from "react"`); no `import * as React` or default import.
- `cn` comes from the [`cn`](https://www.npmjs.com/package/cn) package (`import { cn } from "cn"`), the same import shadcn's registry generates. `clsx` and `tailwind-merge` are banned (`no-restricted-imports`): if a `shadcn add` recreates a `utils.ts` built on them, delete it and drop both dependencies.

React (front-end and its tests):

- `@eslint-react` `strict-type-checked` plus `eslint-plugin-react-hooks` `recommended`; the hooks plugin owns hook rules, so `@eslint-react`'s duplicates are off.
- JSX: boolean shorthand (`disabled`), `<>` instead of an unkeyed `<Fragment>`, no needless curly braces, self-closing empty elements.

Severity: only `no-unused-vars`, `no-console` (except `warn`/`error`), and `no-unnecessary-condition` warn; everything else errors. Warnings still fail `bun run lint`.

Overrides: test files (`*.test.ts(x)`, `*.e2e.ts`) relax the `no-unsafe-*`, non-null-assertion, and return-type rules; shadcn components in `front-end/src/shared/components/ui/` skip naming, return-type, and function-style rules; both `front-end/src/shared/components/ui/` and `test/` are exempt from the optional-member ban. The reformat commit is listed in `.git-blame-ignore-revs`.

Run `bun run lint` and `bun run typecheck` frequently rather than at the end.

## Content authoring

Markdown content lives in `content/` and is authored in Obsidian. [`docs/content-authoring.md`](docs/content-authoring.md) is the single reference for authors: Obsidian settings, image syntax, the frontmatter reference (required fields and allowed values), and the `bun run --filter back-end validate:content` check. A document with invalid frontmatter is silently left out of the site, so run that check before pushing content changes.

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

The security side of these layers (trust boundaries, secrets, supply chain, review focus, reporting) is set out in [`docs/security/SECURITY-AI.md`](docs/security/SECURITY-AI.md).

What these layers produce is measurable: quality gates, coverage and its floors, PR acceptance (agent vs. other), and nightly compliance are catalogued in [`docs/metrics/`](docs/metrics/README.md) with where each is published and how to reproduce it.

## Release notes

Deployment details (server bootstrap, pod manifests, image publishing) live in [`docs/deploy.md`](docs/deploy.md), and the README's [Architecture](README.md#architecture) diagram summarises them; keep both in sync when you change infrastructure.