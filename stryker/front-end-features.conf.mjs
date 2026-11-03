import { base } from "./base.mjs";

// The front-end's feature folders, split out of stryker/front-end.conf.mjs so
// that each half finishes inside the mutation job's timeout. Both halves run the
// whole front-end suite per mutant.
export default {
  ...base,
  mutate: ["front-end/src/features/**/*.{ts,tsx}", "!**/*.d.ts"],
  commandRunner: { command: "bun run --filter front-end test" },
  htmlReporter: { fileName: "reports/mutation/front-end-features.html" },
  jsonReporter: { fileName: "reports/mutation/front-end-features.json" },
};
