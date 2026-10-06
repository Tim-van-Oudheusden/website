import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowsDir = resolve(import.meta.dirname, "../../../.github/workflows");
const claudeAction = "uses: anthropics/claude-code-action@";

function readWorkflow(name: string): string {
  return readFileSync(resolve(workflowsDir, name), "utf8");
}

describe(".github/workflows/claude.yml", () => {
  test("is the only workflow that runs Claude Code, so one mention starts one run", () => {
    const runners = readdirSync(workflowsDir).filter((name) => readWorkflow(name).includes(claudeAction));

    expect(runners).toEqual(["claude.yml"]);
  });

  test("pins the action to a commit and only answers trusted mentions", () => {
    const workflow = readWorkflow("claude.yml");

    expect(workflow).toMatch(/uses: anthropics\/claude-code-action@[0-9a-f]{40}\b/);
    expect(workflow).toContain("label_trigger: ai-fix-requested");
    expect(workflow.match(/contains\(github\.event\.(comment|review)\.body, '@claude'\)/g)).toHaveLength(3);
    expect(workflow.match(/fromJSON\('\["OWNER","MEMBER","COLLABORATOR"\]'\)/g)).toHaveLength(3);
    expect(workflow).not.toContain("pull_request_target");
  });
});
