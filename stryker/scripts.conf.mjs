import { base } from "./base.mjs";

export default {
  ...base,
  // readme-screenshots.ts drives a browser against the dev pod and has no unit
  // test; the plan it runs (readme-screenshot-plan.ts) is mutated instead.
  mutate: ["scripts/**/*.ts", "!scripts/readme-screenshots.ts"],
  // Only the test/shared files that run a scripts/*.ts, for the same reason the
  // shared config leaves out the rest of test/shared (docs/testing.md).
  commandRunner: {
    command: "cd shared && bun test $(grep -lE 'scripts/[a-z-]+(\\.ts)?\"' ../test/shared/src/*.test.ts)",
  },
  htmlReporter: { fileName: "reports/mutation/scripts.html" },
  jsonReporter: { fileName: "reports/mutation/scripts.json" },
};
