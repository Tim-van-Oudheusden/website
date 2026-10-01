# Copilot Instructions

Guidance for GitHub Copilot agents working in this repository.
**`AGENTS.md` at the repo root is the authoritative agent instructions file —
when this file conflicts with AGENTS.md, AGENTS.md wins.**

## Issue tracking

- GitHub issues are the primary source of truth. Read, claim, and close issues
  through `gh`; never through local mirrors.
- Beads (`bd`) mirrors issue state locally — run `export GITHUB_TOKEN="$(gh auth token)"`
  before `bd github` commands, and use `bd github sync --pull-only` after
  GitHub-only changes. Never make a standalone sync commit; if the repo's own
  hooks stage the `.beads/issues.jsonl` export alongside issue work, let them.
- Work one issue at a time; pick work via `bd ready` / `gh issue list`, and let
  child/follow-up issues wait for their parents regardless of issue number.

## Engineering rules

- Bun TS workspace: `front-end` (React 19), `back-end` (Fastify), `shared`
  (contracts). Per-workspace scripts: `bun run --filter <name> <script>`.
- TDD is mandatory for code changes: one failing test first, implement, run the
  failing test, then the full suite. Never modify tests to make them pass;
  never add type suppressions to silence failures.
- Test behaviour, not implementation: assert observable outputs, not class
  strings or private state. `bun:test` with `renderToStaticMarkup` for
  components; keep pure logic in testable modules.
- Quality gates after any change: `bun run test`, `bun run typecheck`,
  `bun run lint`, `bun run build`.
- No new dependencies without explicit approval; always an exact version;
  never `--force` / `--legacy-peer-deps`.
- Conventional Commits, one commit per issue, referencing the issue number.
- Push after each issue: `git pull --rebase`, `bd dolt push`, `git push`, then
  confirm `git status` shows up to date with origin.

See `CONTRIBUTING.md` for contributor workflow and `AGENTS.md` for the full
agent ruleset.