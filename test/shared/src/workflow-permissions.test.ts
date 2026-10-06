import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowsDir = resolve(import.meta.dirname, "../../../.github/workflows");

interface Workflow {
  permissions?: unknown;
  jobs: Record<string, { permissions?: unknown }>;
}

// These jobs run third-party install scripts on push/schedule/dispatch, where the
// default GITHUB_TOKEN may be write-scoped; they only need to read the repo. Jobs
// needing more must say so with their own block, which replaces the top-level one.
describe.each([
  { name: "ci.yml", jobOverrides: { release: { contents: "read", packages: "write" } } },
  { name: "coverage-gate.yml", jobOverrides: {} },
  { name: "quality-report.yml", jobOverrides: {} },
])(".github/workflows/$name", ({ name, jobOverrides }) => {
  test("restricts GITHUB_TOKEN to reading repository contents unless a job opts into more", () => {
    const workflow = Bun.YAML.parse(readFileSync(resolve(workflowsDir, name), "utf8")) as Workflow;
    const declaredOverrides = Object.fromEntries(
      Object.entries(workflow.jobs)
        .filter(([, job]) => job.permissions !== undefined)
        .map(([jobName, job]) => [jobName, job.permissions]),
    );

    expect(workflow.permissions).toEqual({ contents: "read" });
    expect(declaredOverrides).toEqual(jobOverrides);
  });
});
