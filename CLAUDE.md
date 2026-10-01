# CLAUDE.md

Companion instructions for Claude-family agents working in this repository.
**`AGENTS.md` is the authoritative agent instructions file — when this file
conflicts with AGENTS.md, AGENTS.md wins.**

## Issue tracking

- GitHub issues are the primary source of truth for all work. Read, claim, and
  close issues exclusively through the GitHub API (`gh` CLI) — never via local
  mirrors.
- Beads (`bd`) mirrors issue state locally; before any `bd github` command run
  `export GITHUB_TOKEN="$(gh auth token)"`. After GitHub-only changes use
  `bd github sync --pull-only`. Never make a standalone sync/`issues.jsonl`
  commit — if the repo's own hooks stage the export alongside issue work, let
  them; otherwise leave it out.
- Work one issue at a time and commit after each finished issue; pick work via
  `bd ready` / `gh issue list` rather than by number order alone (child/follow-up
  issues must wait for their parents).

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
- Push after each issue: `git pull --rebase`, `bd dolt push`, `git push`,
  then confirm `git status` shows up to date with origin.

See `CONTRIBUTING.md` for contributor workflow and `AGENTS.md` for the full
agent ruleset.