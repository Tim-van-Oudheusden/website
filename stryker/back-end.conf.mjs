import { base } from "./base.mjs";

export default {
  ...base,
  mutate: ["back-end/src/**/*.ts"],
  commandRunner: { command: "bun run --filter back-end test" },
  htmlReporter: { fileName: "reports/mutation/back-end.html" },
  jsonReporter: { fileName: "reports/mutation/back-end.json" },
};
