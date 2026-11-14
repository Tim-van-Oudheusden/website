import { base } from "./base.mjs";

export default {
  ...base,
  mutate: [
    "back-end/src/**/*.ts",
    // Mutated by stryker/back-end-content.conf.mjs.
    "!back-end/src/features/content/**",
  ],
  // Same suite and per-test timeout as stryker/back-end-content.conf.mjs (#1264).
  commandRunner: { command: "bun run --filter back-end test --timeout 30000" },
  htmlReporter: { fileName: "reports/mutation/back-end.html" },
  jsonReporter: { fileName: "reports/mutation/back-end.json" },
};
