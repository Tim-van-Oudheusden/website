<!--
Title must follow Conventional Commits, e.g. `feat(home): ...`, `fix(deps): ...`, `docs(agents): ...`.
-->
## Summary

**What:** <!-- one or two sentences: the change -->

**Why:** <!-- the problem it solves; link the GitHub issue -->

Fixes #<!-- issue number -->

## Testing

<!-- Evidence, not claims. Paste failing-before/passing-after output for the changed path. -->

- [ ] New/changed behaviour covered by a test written first (TDD); test confirmed failing before implementation
- [ ] Test asserts observable behaviour, never implementation internals

## Quality gates

- [ ] `bun run test` passes (full suite)
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run build` passes

## Notes for the reviewer

<!-- Anything risky, out of scope, or needing a second look. -->

## Dependencies

<!-- Only if changed:
- Name, explicit version, and why (ask before installing)
- Never use --force / --legacy-peer-deps
-->
- None