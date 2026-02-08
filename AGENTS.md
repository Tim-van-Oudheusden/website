# Agent Instructions

This project uses **bd** (beads) for issue tracking. Run `bd onboard` to get started.

## Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --status in_progress  # Claim work
bd close <id>         # Complete work
bd sync               # Sync with git
```

## Landing the Plane (Session Completion)

**When ending a work session**, you MUST complete ALL steps below.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Commit all changes** - This is MANDATORY:
   ```bash
   git add <files>
   bd sync
   git commit -m "..."
   ```
5. **Push to remote** (if the branch has an upstream remote):
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
   If there is no remote (local-only or ephemeral branch), skip this step.
6. **Clean up** - Clear stashes, prune remote branches
7. **Verify** - All changes committed. If a remote exists, also pushed.
8. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until all changes are committed
- If a remote exists, work is NOT complete until `git push` succeeds
- NEVER stop before committing - that leaves work stranded in the working tree
- NEVER say "ready to commit when you are" - YOU must commit (and push if applicable)
- If push fails, resolve and retry until it succeeds
- Every commit message MUST follow Conventional Commits format (for example: `feat(scope): short summary`)
- Do NOT use short-hand if expressions (`condition ? this : that`); use explicit `if/else` blocks only

## Testing

- **TDD must be used** - Write tests before implementation code
- **Quality over quantity** - Fewer meaningful tests that cover real behaviour are better than many shallow tests
- **One test at a time** - Write one failing test, make it pass, refactor, then write the next. Do not generate an entire test suite up front
- **Confirm the test fails first** - Run each new test and verify it fails for the expected reason before writing any implementation. This catches phantom tests that pass trivially
- **Test behaviour, not implementation** - Assert against observable outputs, return values, and side effects. Never assert on internal state or private methods. Tests that break on refactor (without behaviour change) are wrong
- **Run the full suite after every change** - Not just the new test. AI refactoring frequently breaks existing functionality
- **Never modify tests to make them pass** - Fix the implementation, not the test. Never delete, skip, comment out, or weaken assertions. Never add `@pytest.mark.skip`, `@ts-expect-error`, `# type: ignore`, or similar suppressions to silence failures
- **Don't over-implement** - If the test passes, the implementation is done. Do not add code that is not required by a failing test

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
