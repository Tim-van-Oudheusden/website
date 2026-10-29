# Beads retirement decision

Date: 2026-10-29
Issue: #988

## Question

GitHub issues became the primary source of truth on 2026-09-29. Since then
Hive and Claude Code in CI work this repo without `bd` installed. Does the
beads mirror still differ from GitHub, is that gap growing, and is beads still
worth its upkeep?

## Decision

Retire beads. GitHub issues are now the only tracker. The `.beads/` directory,
the `bd` steps in the agent instructions and docs, and `bd` in the Pi sandbox
image are removed. History stays readable: `refs/dolt/data` on the GitHub
remote still holds the full Dolt database, and git history holds the old
`.beads/issues.jsonl` exports.

## Method

- GitHub: every issue (pull requests excluded) from
  `GET /repos/Tim-van-Oudheusden/website/issues?state=all`, on 2026-10-29.
- Beads: `dolt clone git+https://github.com/Tim-van-Oudheusden/website.git`,
  which reads `refs/dolt/data` (head `1084054`, last push 2026-10-29 19:49 UTC,
  632 Dolt commits). The committed `.beads/issues.jsonl` (271 rows, last
  updated 2026-10-01) is a stale export and was not used.
- Lag before a sync: the beads state at the last Dolt commit of one sync day,
  compared with GitHub at the first Dolt commit of the next sync day.

## Findings

### Beads holds nothing GitHub lacks

| Beads table | Rows | Notes |
| --- | ---: | --- |
| `issues` | 780 | Every row has a GitHub `external_ref`. 705 distinct issues; 75 are duplicates from a double import on 2026-10-03 |
| `dependencies` | 46 | 19 parent-child, 16 blocks, 11 discovered-from. Both ends are closed in every one. The last was added on 2026-10-06 |
| `comments` | 4 | All from 2026-08-24, on issues that are now closed |
| `config` memory (`bd remember`) | 1 | "Use podman instead of docker"; AGENTS.md already says this |
| `federation_peers`, `routes` | 0 | Never used |

No issue exists only in beads, and no open work depends on beads-only data.
Nothing needs migrating.

### The mirror only stays current through manual syncs, and the lag is growing

On 2026-10-29, just after a sync, beads lacked 2 of 707 GitHub issues (#986,
#988). It still showed #797 as open, though GitHub closed it on 2026-10-12,
and it held #569 twice, once open and once closed. Before each sync the gap
was bigger:

| Beads state from | Synced again | Whole days between | GitHub issues | Missing from beads |
| --- | --- | ---: | ---: | ---: |
| 2026-10-01 | 2026-10-02 | 0 | 463 | 4 |
| 2026-10-02 | 2026-10-03 | 0 | 477 | 9 |
| 2026-10-03 | 2026-10-04 | 0 | 487 | 8 |
| 2026-10-04 | 2026-10-05 | 1 | 492 | 13 |
| 2026-10-05 | 2026-10-06 | 0 | 500 | 4 |
| 2026-10-06 | 2026-10-07 | 0 | 540 | 27 |
| 2026-10-07 | 2026-10-08 | 0 | 563 | 14 |
| 2026-10-08 | 2026-10-11 | 3 | 600 | 19 |
| 2026-10-11 | 2026-10-12 | 0 | 617 | 12 |
| 2026-10-12 | 2026-10-13 | 0 | 632 | 10 |
| 2026-10-13 | 2026-10-14 | 0 | 637 | 5 |
| 2026-10-14 | 2026-10-16 | 2 | 652 | 19 |
| 2026-10-16 | 2026-10-19 | 2 | 669 | 32 |
| 2026-10-19 | 2026-10-29 | 10 | 694 | 25 |

The time between syncs has grown from under a day in early October to ten days.
GitHub gained 452 issues between 2026-09-30 and 2026-10-29, about 15 a day.
`hive-forge-app[bot]` filed 170 of them. Hive and CI cannot run `bd` (it is not
installed there; see `docs/reflections/2026-10-03-gh-cli-in-cloud-sessions.md`),
so only the maintainer's device keeps the mirror alive.

### Upkeep

Every agent session was told to `bd dolt push`, `bd github sync --pull-only`
and `export GITHUB_TOKEN`. A full bidirectional sync could hang for more than
five minutes (`.claude/memory/corrections.tsv`, 2026-09-30). Beads also
installed git hooks, a merge driver for `issues.jsonl`, and a CLI in the
sandbox image. Its rule "use `bd` for ALL task tracking" contradicted the
GitHub-first section above it.

## Conclusion

The issue set the test: retire beads if the gap is large and growing. The gap
grows with every day between syncs, and syncs are getting further apart while
most new issues come from automation that cannot sync. Beads adds no data of
its own. Its one addition over plain issues, dependency links, has not been
used since 2026-10-06; GitHub sub-issues cover that if it is needed again.

## Local cleanup for existing clones

Removing the tracked files does not touch local state. On a device that ran
`bd`:

- Remove the beads git hooks (`.git/hooks/*` entries with the
  `BEADS INTEGRATION` marker), or unset `core.hooksPath` if it points at
  `.beads/hooks`.
- Delete `.beads/` when it is no longer wanted. The root `.gitignore` still
  ignores it, so it cannot be committed by accident.
- Optionally delete `refs/dolt/data` and `refs/heads/__dolt_remote_info__` from
  the GitHub remote. This is irreversible, so it is left to the maintainer.
