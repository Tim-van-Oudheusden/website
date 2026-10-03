# GitHub CLI in cloud sessions

## Context

#509 (ACMM L4 `acmm:cross-session-knowledge`), worked from a Claude Code cloud
session following `.claude/skills/github-issue-flow/SKILL.md`.

## What happened

- `gh issue view 509` failed with `HTTP 403: GitHub GraphQL is not available
  from Claude Code sessions`. The high-level `gh issue` / `gh pr` subcommands
  use GraphQL, so they fail the same way there.
- `gh api` against the REST endpoints worked for reading, claiming, commenting
  on, and closing issues.
- `bd` was not installed in the cloud container, so the beads mirror and
  `bd dolt push` steps could not run from that session.

## Lesson

In cloud sessions, drive issues through REST with `gh api`:

```bash
gh api repos/Tim-van-Oudheusden/website/issues/<n>                      # read
gh api repos/Tim-van-Oudheusden/website/issues/<n>/comments              # discussion
gh api -X POST repos/Tim-van-Oudheusden/website/issues/<n>/assignees \
  -f 'assignees[]=Tim-van-Oudheusden'                                    # claim
gh api -X POST repos/Tim-van-Oudheusden/website/issues/<n>/comments \
  -f body='…'                                                            # comment
gh api -X PATCH repos/Tim-van-Oudheusden/website/issues/<n> \
  -f state=closed -f state_reason=completed                              # close
```

When `bd` is missing, skip the beads mirror and say so in the hand-off; the
next session on a device with `bd` runs `bd github sync --pull-only` to catch
up, since GitHub stays the source of truth (AGENTS.md).

## Encoded in

Not yet in the skill; this reflection is the record.
