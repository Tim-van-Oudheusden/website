import { base } from "./base.mjs";

export default {
  ...base,
  mutate: ["shared/src/**/*.ts"],
  commandRunner: {
    command: "bun run --filter back-end test --timeout 30000 && bun run --filter front-end test && cd shared && bun test $(grep -lE 'from \"(shared|[./]+/shared/src)' ../test/shared/src/*.test.ts)",
  },
  htmlReporter: { fileName: "reports/mutation/shared.html" },
  jsonReporter: { fileName: "reports/mutation/shared.json" },
};
