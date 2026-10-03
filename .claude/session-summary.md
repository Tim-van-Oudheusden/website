# Session summary

Hand-off notes for agent work in this repository, so the next session starts
from where the last one stopped instead of cold (AGENTS.md "Session
Completion" step 7). Keep it short: overwrite the "Latest session" section at
the end of each session; durable lessons belong in
`.claude/memory/corrections.tsv` or `bd remember`, not here.

Format: date, issue/PR worked, outcome, open follow-ups, gotchas for next time.

## Latest session

- **Date:** 2026-10-02
- **Worked:** #491 — add this session summary artifact (ACMM L3
  `acmm:session-summary`).
- **Outcome:** `.claude/session-summary.md` added; docs-only change, no code
  or tests touched.
- **Open follow-ups:** none.
- **Notes for next session:**
  - Start from `bd ready` / `gh issue list`; AGENTS.md is authoritative and
    `.claude/skills/github-issue-flow/SKILL.md` encodes the per-issue loop.
  - Check `.claude/memory/corrections.tsv` before touching eslint-sensitive
    test code or running `bd github sync` (use `--pull-only`).
  - The agent sandbox has no podman: run only the unit/typecheck/lint/build
    gates (`docs/testing.md`).
