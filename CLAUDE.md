# CLAUDE.md

Companion instructions for Claude-family agents working in this repository.
**`AGENTS.md` is the authoritative agent instructions file — when this file
conflicts with AGENTS.md, AGENTS.md wins.**

## Issue tracking

- GitHub issues are the single source of truth for all work. Read and claim
  issues exclusively through the GitHub API (`gh` CLI); an issue closes when
  the PR that says `Fixes #<number>` merges. The beads (`bd`) mirror was
  retired in #988.
- Work one issue at a time and commit after each finished issue; pick work via
  `gh issue list` rather than by number order alone (child/follow-up issues
  must wait for their parents).

## Engineering rules

- Bun TS workspace: `front-end` (React 19), `back-end` (Fastify), `shared`
  (contracts). Per-workspace scripts: `bun run --filter <name> <script>`.
- TDD is mandatory for code changes: one failing test first, implement, run the
  failing test, then the full suite. Never modify tests to make them pass;
  never add type suppressions to silence failures.
- Test behaviour, not implementation: assert on observable outputs, not class
  strings or private state. `bun:test` with `renderToStaticMarkup` for
  components; keep pure logic in testable modules.
- Quality gates after any change: `bun run test`, `bun run typecheck`,
  `bun run lint`, `bun run build`.
- No new dependencies without explicit approval; always an exact version;
  never `--force` / `--legacy-peer-deps`.
- Conventional Commits, one commit per issue, referencing the issue number.
- Land each issue through a pull request: branch `<type>/<number>-<slug>` off
  `main`, `git push -u origin HEAD`, then `gh pr create` with
  `Fixes #<number>` in the body. `main` is protected; once the required checks
  pass the merge queue merges it (the maintainer merges high-risk or `hold` PRs).

See `CONTRIBUTING.md` for contributor workflow and `AGENTS.md` for the full
agent ruleset.