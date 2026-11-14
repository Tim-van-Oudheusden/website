import { base } from "./base.mjs";

// The back-end's content feature, split out of stryker/back-end.conf.mjs so
// that each half finishes inside the mutation job's timeout. Both halves run the
// whole back-end suite per mutant.
export default {
  ...base,
  mutate: ["back-end/src/features/content/**/*.ts"],
  // Above Stryker's per-mutant timeout, so a slow runner cannot fail every
  // mutant on bun's 5 s per-test default (#1264).
  commandRunner: { command: "bun run --filter back-end test --timeout 30000" },
  htmlReporter: { fileName: "reports/mutation/back-end-content.html" },
  jsonReporter: { fileName: "reports/mutation/back-end-content.json" },
};
