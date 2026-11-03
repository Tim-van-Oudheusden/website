import { base } from "./base.mjs";

export default {
  ...base,
  mutate: [
    "front-end/src/**/*.{ts,tsx}",
    "front-end/server/**/*.ts",
    "!front-end/src/shared/components/ui/**",
    // Mutated by stryker/front-end-features.conf.mjs.
    "!front-end/src/features/**",
    "!**/*.d.ts",
  ],
  commandRunner: { command: "bun run --filter front-end test" },
  htmlReporter: { fileName: "reports/mutation/front-end.html" },
  jsonReporter: { fileName: "reports/mutation/front-end.json" },
};
