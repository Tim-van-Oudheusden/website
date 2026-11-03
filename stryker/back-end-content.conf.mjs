import { base } from "./base.mjs";

// The back-end's content feature, split out of stryker/back-end.conf.mjs so
// that each half finishes inside the mutation job's timeout. Both halves run the
// whole back-end suite per mutant.
export default {
  ...base,
  mutate: ["back-end/src/features/content/**/*.ts"],
  commandRunner: { command: "bun run --filter back-end test" },
  htmlReporter: { fileName: "reports/mutation/back-end-content.html" },
  jsonReporter: { fileName: "reports/mutation/back-end-content.json" },
};
