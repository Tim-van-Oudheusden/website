import { base } from "./base.mjs";

export default {
  ...base,
  mutate: [
    "back-end/src/**/*.ts",
    // Mutated by stryker/back-end-content.conf.mjs.
    "!back-end/src/features/content/**",
  ],
  commandRunner: { command: "bun run --filter back-end test" },
  htmlReporter: { fileName: "reports/mutation/back-end.html" },
  jsonReporter: { fileName: "reports/mutation/back-end.json" },
};
