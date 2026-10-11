import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowsDir = resolve(import.meta.dirname, "../../../.github/workflows");

interface Workflow {
  jobs: Record<string, { "timeout-minutes"?: unknown }>;
}

// A job without timeout-minutes runs for GitHub's six-hour default when a step
// hangs (a stalled network call, a waiting prompt), holding a runner the whole time.
describe.each(readdirSync(workflowsDir).filter((name) => /\.ya?ml$/.test(name)))(
  ".github/workflows/%s",
  (name) => {
    test("bounds every job with timeout-minutes", () => {
      const workflow = Bun.YAML.parse(
        readFileSync(resolve(workflowsDir, name), "utf8"),
      ) as Workflow;
      const unbounded = Object.entries(workflow.jobs)
        .filter(([, job]) => typeof job["timeout-minutes"] !== "number")
        .map(([jobName]) => jobName);

      expect(unbounded).toEqual([]);
    });
  },
);
