import { base } from "./base.mjs";

export default {
  ...base,
  // readme-screenshots.ts drives a browser against the dev pod and has no unit
  // test; the plan it runs (readme-screenshot-plan.ts) is mutated instead.
  // deploy/systemd/*.ts is the host-side check of an image's pod manifest.
  mutate: ["scripts/**/*.ts", "!scripts/readme-screenshots.ts", "deploy/systemd/*.ts"],
  // Only the test/shared files that run a scripts/*.ts or import a
  // deploy/systemd/*.ts, for the same reason the shared config leaves out the
  // rest of test/shared (docs/testing.md). A test that only reads one of these
  // files as text (doc-claims) would fail on every instrumented mutant.
  commandRunner: {
    command:
      "cd shared && bun test $(grep -lE 'scripts/[a-z-]+(\\.ts)?\"|from \"[./]+/deploy/systemd/' ../test/shared/src/*.test.ts)",
  },
  htmlReporter: { fileName: "reports/mutation/scripts.html" },
  jsonReporter: { fileName: "reports/mutation/scripts.json" },
};
