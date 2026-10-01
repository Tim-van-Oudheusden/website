# Code Review Prompt

Review the diff between `<FIXED_POINT>` and `<HEAD>` in the `website` repository
(Bun TS workspace: `front-end` React 19, `back-end` Fastify, `shared` contracts).

Check two axes and report them separately:

## Standards
- TDD compliance: tests were written for the behaviour being changed, assert
  observable outputs (not class strings or private state), and the full suite
  passes (`bun run test`).
- No test weakened/deleted to make CI pass; no `@ts-expect-error` / `# type:
  ignore` suppressions added; no new dependencies without approval.
- Gates green: `bun run test`, `bun run typecheck`, `bun run lint`, `bun run build`.
- Conventional Commits, one commit per issue, issue number referenced.

## Spec
- Every acceptance criterion named in `<ISSUE>` is implemented and tested.
- No unrequested behaviour (scope creep); no partially implemented criteria.

Quote the offending line and source rule for each finding. Under 400 words.