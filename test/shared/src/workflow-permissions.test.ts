import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowsDir = resolve(import.meta.dirname, "../../../.github/workflows");

interface Workflow {
  permissions?: unknown;
  jobs: Record<string, { permissions?: unknown }>;
}

// These jobs run third-party install scripts on push/schedule/dispatch, where the
// default GITHUB_TOKEN may be write-scoped; they only need to read the repo.
describe.each(["coverage-gate.yml", "quality-report.yml"])(".github/workflows/%s", (name) => {
  test("restricts GITHUB_TOKEN to reading repository contents", () => {
    const workflow = Bun.YAML.parse(readFileSync(resolve(workflowsDir, name), "utf8")) as Workflow;

    expect(workflow.permissions).toEqual({ contents: "read" });

    for (const job of Object.values(workflow.jobs)) {
      expect(job.permissions).toBeUndefined();
    }
  });
});
