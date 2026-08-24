# Agent Instructions

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:ca08a54f -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   bd dolt push
   git push
   git status  # MUST show "up to date with origin"
   ```
   (No separate `bd sync` / issues.jsonl commit step is needed; see `bd prime` for the current protocol.)
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->

## Git and Version Management

- Work must always be committed after finishing a beads issue.
- Commits must always follow the Conventional Commits specification.
- Bead data lives in the Dolt database (`.beads/embeddeddolt/`, gitignored). Sync it to the remote with `bd dolt push` / `bd dolt pull` against `refs/dolt/data` on the git remote (already part of the Session Completion workflow). `.beads/issues.jsonl` is only an optional export/interchange file — not the source of truth — so do not commit it as a sync step.
- After everything is committed, push it to the remote (oneshot, if any errors still pop up ask the user).

## Testing

- **TDD must be used** - Write tests before implementation code
- **Quality over quantity** - Fewer meaningful tests that cover real behaviour are better than many shallow tests
- **One test at a time** - Write one failing test, make it pass, refactor, then write the next. Do not generate an entire test suite up front
- **Confirm the test fails first** - Run each new test and verify it fails for the expected reason before writing any implementation. This catches phantom tests that pass trivially
- **Test behaviour, not implementation** - Assert against observable outputs, return values, and side effects. Never assert on internal state or private methods. Tests that break on refactor (without behaviour change) are wrong
- **Run the full suite after every change** - Not just the new test. AI refactoring frequently breaks existing functionality
- **Never modify tests to make them pass** - Fix the implementation, not the test. Never delete, skip, comment out, or weaken assertions. Never add `@pytest.mark.skip`, `@ts-expect-error`, `# type: ignore`, or similar suppressions to silence failures
- **Don't over-implement** - If the test passes, the implementation is done. Do not add code that is not required by a failing test
- **E2E with Docker** - Run docker compose up when kicking off Playwright tests, shutdown when finished.

## Dependency Management

### Ask First
- **Never install, upgrade, or remove a package without explicit user approval.** State the package name, version, and why it is needed
- **Never use `--force` or `--legacy-peer-deps`** (or Bun equivalents) to bypass dependency conflicts. Report the conflict and ask for guidance

### Before Proposing a New Dependency
- **Verify the package exists** on the official registry and has a real repository with meaningful history and downloads. LLMs hallucinate package names (~20% of AI-suggested packages don't exist), and attackers register these names with malicious payloads (slopsquatting)
- **Check whether the functionality already exists** in the language stdlib, Web APIs, or a dependency the project already has. Do not add packages for things like URL parsing (`new URL()`), deep cloning (`structuredClone()`), or other built-ins
- **Check whether the package is deprecated or superseded.** Do not suggest packages from training data that have been replaced (e.g. `moment` -> `date-fns`, `request` -> `fetch`)

### Version Discipline
- **Always specify an explicit version** when installing (e.g. `bun add foo@3.2.1`), never bare `bun add foo`
- **Match the version range style** already used in package.json (exact, caret, tilde). Do not mix conventions
- **Never upgrade a major version as a side-effect** of another change. Major upgrades are their own task/PR

### Lock Files
- **Never manually edit lock files** (`bun.lock`). They must only be modified by running the package manager
- To resolve lock file conflicts: accept one side, delete the lock file, re-run `bun install`, and commit the result
- Always commit lock file changes alongside package.json changes

### Removal
- Before removing a dependency, **search the entire codebase** for all imports, requires, and dynamic references to it
- Check that no other package depends on it as a peer dependency

