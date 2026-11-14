import { base } from "./base.mjs";

// The back-end's content feature, split out of stryker/back-end.conf.mjs so
// that each half finishes inside the mutation job's timeout. Both halves run the
// whole back-end suite per mutant.
export default {
  ...base,
  mutate: ["back-end/src/features/content/**/*.ts"],
  // `--timeout 30000` lifts bun's 5 s per-test default well above Stryker's own
  // per-mutant timeout (dry run × 1.5 + 5 s, about 10-14 s), so Stryker decides
  // when a mutant hangs. Instrumented frontmatter.ts slows the exhaustive YAML
  // test enough that, on a slow runner with 4 suites at once, bun's default
  // failed it on every mutant and the score read a vacuous 100% (#1264).
  commandRunner: { command: "bun run --filter back-end test --timeout 30000" },
  htmlReporter: { fileName: "reports/mutation/back-end-content.html" },
  jsonReporter: { fileName: "reports/mutation/back-end-content.json" },
};
