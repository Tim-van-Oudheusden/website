import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const githubDir = resolve(import.meta.dirname, "../../../.github");
const workflowsDir = resolve(githubDir, "workflows");

type Permissions = Record<string, string>;

interface Workflow {
  permissions?: Permissions;
  jobs: Record<string, { permissions?: Permissions }>;
}

interface WorkflowRule {
  permissions?: Permissions | null;
  jobs?: Record<string, Permissions>;
}

interface PermissionsPolicy {
  default: Permissions;
  workflows: Record<string, WorkflowRule | null>;
}

const policy = Bun.YAML.parse(
  readFileSync(resolve(githubDir, "policies/workflow-permissions.yml"), "utf8"),
) as PermissionsPolicy;
const workflowNames = readdirSync(workflowsDir).filter((name) => /\.ya?ml$/.test(name)).sort();

describe(".github/policies/workflow-permissions.yml", () => {
  test("has a rule for every workflow, and only for workflows that exist", () => {
    expect(Object.keys(policy.workflows).sort()).toEqual(workflowNames);
  });
});

describe.each(workflowNames)(".github/workflows/%s", (name) => {
  test("grants GITHUB_TOKEN exactly the permissions the policy allows", () => {
    const workflow = Bun.YAML.parse(readFileSync(resolve(workflowsDir, name), "utf8")) as Workflow;
    const rule = policy.workflows[name] ?? {};
    // A `permissions: null` rule means the workflow declares no top-level block.
    const expectedTopLevel = rule.permissions === undefined ? policy.default : rule.permissions ?? undefined;
    const declaredJobGrants = Object.fromEntries(
      Object.entries(workflow.jobs)
        .filter(([, job]) => job.permissions !== undefined)
        .map(([jobName, job]) => [jobName, job.permissions]),
    );

    expect(workflow.permissions).toEqual(expectedTopLevel);
    expect(declaredJobGrants).toEqual(rule.jobs ?? {});
  });
});
