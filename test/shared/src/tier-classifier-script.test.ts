import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/tier-classify.sh");
const workflowPath = resolve(rootPath, ".github/workflows/tier-classifier.yml");
const docPath = resolve(rootPath, "docs/risk-tiers.md");

function classify(
  paths: string[],
  env: Record<string, string> = {},
  args: string[] = [],
): { status: number | null; output: string } {
  const nul = args.includes("-z");
  const result = spawnSync("bash", [scriptPath, ...args], {
    cwd: rootPath,
    encoding: "utf8",
    input: nul ? paths.map((path) => `${path}\0`).join("") : paths.join("\n"),
    env: { PATH: process.env["PATH"] ?? "", ...env },
  });

  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

describe("scripts/tier-classify.sh", () => {
  test("classifies a content and docs only change as low risk", () => {
    const { status, output } = classify(["content/articles/hello.md", "docs/testing.md"]);

    expect(status).toBe(0);
    expect(output).toContain("tier=low");
  });

  test("classifies application source changes as medium risk", () => {
    for (const path of ["front-end/src/app.tsx", "back-end/src/routes.ts", "shared/src/articles.ts"]) {
      expect(classify(["docs/testing.md", path]).output).toContain("tier=medium");
    }
  });

  test("classifies CI, deploy, dependency and agent-governance changes as high risk", () => {
    for (const path of [
      ".github/workflows/ci.yml",
      "deploy/kube/dev.yaml",
      "front-end/Dockerfile",
      "bun.lock",
      "back-end/package.json",
      "scripts/e2e.sh",
      "AGENTS.md",
      ".claude/skills/github-issue-flow/SKILL.md",
      "prompts/code-review.md",
    ]) {
      expect(classify(["front-end/src/app.tsx", path]).output).toContain("tier=high");
    }
  });

  test("classifies research notes, static assets and top-level prose as low risk", () => {
    const { output } = classify(["research/font_recommendations.md", "public/favicon.svg", "README.md"]);

    expect(output).toContain("tier=low");
  });

  test("treats unrecognised paths, including tests, as medium risk", () => {
    expect(classify(["test/shared/src/routes.test.ts"]).output).toContain("tier=medium");
    expect(classify(["somewhere/new.txt"]).output).toContain("tier=medium");
  });

  test("lists each changed file with its own tier", () => {
    const { output } = classify(["docs/testing.md", "bun.lock"]);

    expect(output).toMatch(/high\s+bun\.lock/);
    expect(output).toMatch(/low\s+docs\/testing\.md/);
  });

  test("reports low risk for an empty change set", () => {
    const { status, output } = classify([]);

    expect(status).toBe(0);
    expect(output).toContain("tier=low");
  });

  test("with -z, rates paths holding non-ASCII, quotes, backslashes or tabs by their rule", () => {
    const { status, output } = classify(
      [".github/workflows/déploy.yml", 'scripts/"q".sh', "deploy/back\\slash.yml", "deploy/tab\there.yml", "content/Café.md"],
      {},
      ["-z"],
    );

    expect(status).toBe(0);
    expect(output).toMatch(/^high\s+\.github\/workflows\/déploy\.yml$/m);
    expect(output).toMatch(/^high\s+scripts\/"q"\.sh$/m);
    expect(output).toMatch(/^high\s+deploy\/back\\slash\.yml$/m);
    expect(output).toMatch(/^high\s+\$'deploy\/tab\\there\.yml'$/m);
    expect(output).toMatch(/^low\s+content\/Café\.md$/m);
    expect(output).toContain("tier=high");
  });

  test("with -z, a newline in a file name cannot forge the tier line", () => {
    const { output } = classify(["deploy/x\ntier=low"], {}, ["-z"]);

    expect(output.match(/^tier=.*$/gm)).toEqual(["tier=high"]);
  });
});

describe("scripts/tier-classify.sh with a custom policy", () => {
  let workDir: string;
  let policyPath: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), "tier-policy-"));
    policyPath = join(workDir, "risk-tiers.policy");
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  function classifyWith(policy: string, paths: string[]) {
    writeFileSync(policyPath, policy);

    return classify(paths, { RISK_TIER_POLICY: policyPath });
  }

  test("applies the first matching rule, ignoring comments and blank lines", () => {
    const policy = ["# secrets first", "high  vault/keys.md", "", "low   vault/*", "low   *.md"].join("\n");

    const { status, output } = classifyWith(policy, ["vault/keys.md", "vault/readme.txt", "notes.md", "src/app.ts"]);

    expect(status).toBe(0);
    expect(output).toMatch(/high\s+vault\/keys\.md/);
    expect(output).toMatch(/low\s+vault\/readme\.txt/);
    expect(output).toMatch(/low\s+notes\.md/);
    expect(output).toMatch(/medium\s+src\/app\.ts/);
    expect(output).toContain("tier=high");
  });

  test("rejects a rule with an unknown tier instead of classifying", () => {
    const { status, output } = classifyWith("critical  deploy/*\n", ["deploy/kube/prod.yaml"]);

    expect(status).not.toBe(0);
    expect(output).toContain("critical");
    expect(output).not.toContain("tier=");
  });

  test("fails when the policy file is missing", () => {
    const { status, output } = classify(["docs/testing.md"], { RISK_TIER_POLICY: join(workDir, "absent.policy") });

    expect(status).not.toBe(0);
    expect(output).not.toContain("tier=");
  });
});

describe(".github/workflows/tier-classifier.yml", () => {
  test("classifies pull requests with the script, passing PR fields via env rather than inline", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("pull_request:");
    expect(workflow).toContain("scripts/tier-classify.sh");
    expect(workflow).not.toMatch(/run:[^\n]*\$\{\{\s*github\.event\.pull_request/);
  });

  describe("Classify changed files", () => {
    let workDir: string;

    beforeEach(() => {
      workDir = mkdtempSync(join(tmpdir(), "tier-classifier-step-"));
    });

    afterEach(() => {
      rmSync(workDir, { recursive: true, force: true });
    });

    function git(...args: string[]): string {
      const result = spawnSync("git", args, { cwd: workDir, encoding: "utf8" });

      expect(result.status).toBe(0);

      return result.stdout.trim();
    }

    function initRepo(): void {
      git("init", "-q");
      git("config", "user.email", "test@example.com");
      git("config", "user.name", "Test");
      git("config", "commit.gpgsign", "false");
    }

    // Runs the workflow step in workDir and returns its notice output and job summary.
    function runStep(baseSha: string, headSha: string): { output: string; summary: string } {
      // Parsed from this repo's own workflow, not outside input: a wrong shape fails the assertions below.
      const workflow = Bun.YAML.parse(readFileSync(workflowPath, "utf8")) as {
        jobs: { classify: { steps: { name?: string; run?: string }[] } };
      };
      const step = workflow.jobs.classify.steps.find((s) => s.name === "Classify changed files");

      expect(step?.run).toBeDefined();

      // The step calls scripts/tier-classify.sh relative to the checkout; link it
      // untracked so it stays out of the diff, and point it at the real policy.
      symlinkSync(resolve(rootPath, "scripts"), join(workDir, "scripts"));
      const summaryPath = join(workDir, "summary.md");

      const result = spawnSync("bash", ["-c", step?.run ?? ""], {
        cwd: workDir,
        encoding: "utf8",
        env: {
          PATH: process.env["PATH"] ?? "",
          BASE_SHA: baseSha,
          HEAD_SHA: headSha,
          GITHUB_STEP_SUMMARY: summaryPath,
          RISK_TIER_POLICY: resolve(rootPath, ".github/policies/risk-tiers.policy"),
        },
      });

      return { output: `${result.stdout}${result.stderr}`, summary: readFileSync(summaryPath, "utf8") };
    }

    test("rates a PR that moves a high-risk file out of its path by the old path too", () => {
      initRepo();
      mkdirSync(join(workDir, ".github/workflows"), { recursive: true });
      writeFileSync(join(workDir, ".github/workflows/ci.yml"), "name: CI\non: push\njobs: {}\n");
      git("add", ".");
      git("commit", "-qm", "base");
      const baseSha = git("rev-parse", "HEAD");

      mkdirSync(join(workDir, "docs"));
      git("mv", ".github/workflows/ci.yml", "docs/ci-moved.yml");
      git("commit", "-qm", "move");
      const headSha = git("rev-parse", "HEAD");

      const { output, summary } = runStep(baseSha, headSha);

      expect(output).toContain("::notice title=Risk tier::high");
      expect(summary).toMatch(/^high\s+\.github\/workflows\/ci\.yml$/m);
    });

    test("rates a high-risk file by its rule even when git would quote its name", () => {
      initRepo();
      git("commit", "-q", "--allow-empty", "-m", "base");
      const baseSha = git("rev-parse", "HEAD");

      // Non-ASCII is C-quoted by plain `git diff --name-only`.
      mkdirSync(join(workDir, ".github/workflows"), { recursive: true });
      writeFileSync(join(workDir, ".github/workflows/déploy.yml"), "name: CI\non: push\njobs: {}\n");
      git("add", ".");
      git("commit", "-qm", "add workflow");
      const headSha = git("rev-parse", "HEAD");

      const { output, summary } = runStep(baseSha, headSha);

      expect(output).toContain("::notice title=Risk tier::high");
      expect(summary).toMatch(/^high\s+\.github\/workflows\/déploy\.yml$/m);
    });
  });
});

describe("docs/risk-tiers.md", () => {
  test("documents every tier the classifier can report", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const tier of ["low", "medium", "high"]) {
      expect(doc).toMatch(new RegExp(`^#+ .*\\b${tier}\\b`, "im"));
    }
  });
});
