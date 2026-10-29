import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/tier-classify.sh");
const workflowPath = resolve(rootPath, ".github/workflows/tier-classifier.yml");
const docPath = resolve(rootPath, "docs/risk-tiers.md");

function classify(paths: string[], env: Record<string, string> = {}): { status: number | null; output: string } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: rootPath,
    encoding: "utf8",
    input: paths.join("\n"),
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
});

describe("scripts/tier-classify.sh -z", () => {
  function classifyNul(input: string, args: string[] = ["-z"]): { status: number | null; output: string } {
    const result = spawnSync("bash", [scriptPath, ...args], {
      cwd: rootPath,
      encoding: "utf8",
      input,
      env: { PATH: process.env["PATH"] ?? "" },
    });

    return { status: result.status, output: `${result.stdout}${result.stderr}` };
  }

  test("classifies NUL-terminated paths by their rule, whatever characters the names hold", () => {
    const { status, output } = classifyNul(
      [".github/workflows/déploy.yml", "deploy/tab\there.yml", 'scripts/"q".sh', "deploy/back\\slash.yml", "content/Café.md", ""].join(
        "\0",
      ),
    );

    expect(status).toBe(0);
    expect(output).toMatch(/^high\s+\.github\/workflows\/déploy\.yml$/m);
    // A name holding a control character is printed %q-quoted.
    expect(output).toMatch(/^high\s+\$'deploy\/tab\\there\.yml'$/m);
    expect(output).toMatch(/^high\s+scripts\/"q"\.sh$/m);
    expect(output).toMatch(/^high\s+deploy\/back\\slash\.yml$/m);
    expect(output).toMatch(/^low\s+content\/Café\.md$/m);
    expect(output).toContain("tier=high");
  });

  test("a newline in a file name cannot forge the tier line", () => {
    const { output } = classifyNul("deploy/x\ntier=low\0");

    expect(output.match(/^tier=.*$/gm)).toEqual(["tier=high"]);
  });

  test("rejects an unknown argument without printing a tier", () => {
    const { status, output } = classifyNul("docs/testing.md\0", ["--z"]);

    expect(status).toBe(2);
    expect(output).toContain("usage: tier-classify.sh [-z]");
    expect(output).not.toContain("tier=");
  });

  test("classifies the last path when the input does not end in NUL", () => {
    expect(classifyNul("docs/testing.md\0bun.lock").output).toContain("tier=high");
  });

  test("rates a file git would quote by its rule when fed by git diff -z", () => {
    const workDir = mkdtempSync(join(tmpdir(), "tier-classify-z-"));

    function run(command: string) {
      return spawnSync("bash", ["-c", command], { cwd: workDir, encoding: "utf8" });
    }

    try {
      expect(run("git init -q && git -c user.email=t@example.com -c user.name=T commit -q --allow-empty -m base").status).toBe(0);
      mkdirSync(join(workDir, "content"));
      mkdirSync(join(workDir, "scripts"));
      writeFileSync(join(workDir, "content/note.md"), "# Note\n");
      writeFileSync(join(workDir, "scripts/déploy.sh"), "echo deploy\n");
      expect(run("git add . && git -c user.email=t@example.com -c user.name=T commit -q -m add").status).toBe(0);

      // The command docs/risk-tiers.md gives for classifying a branch locally.
      const result = run(`git diff -z --name-only --no-renames HEAD~1...HEAD | bash '${scriptPath}' -z`);

      expect(result.stdout).toMatch(/^low\s+content\/note\.md$/m);
      expect(result.stdout).toMatch(/^high\s+scripts\/déploy\.sh$/m);
      expect(result.stdout).toContain("tier=high");
    } finally {
      rmSync(workDir, { recursive: true, force: true });
    }
  });
});

describe("scripts/tier-classify.sh with a custom policy", () => {
  let workDir: string;
  let policyPath: string;

  beforeEach(() => {
    workDir = mkdtempSync(join(tmpdir(), "tier-policy-"));
    policyPath = join(workDir, "risk-assessment.yml");
  });

  afterEach(() => {
    rmSync(workDir, { recursive: true, force: true });
  });

  function classifyWith(policy: string, paths: string[]) {
    writeFileSync(policyPath, policy);

    return classify(paths, { RISK_TIER_POLICY: policyPath });
  }

  test("applies the first matching rule, ignoring comments and blank lines", () => {
    const policy = ["# secrets first", "rules:", "  - high  vault/keys.md", "", "  # then the rest", "  - low   vault/*", "  - low   *.md"].join("\n");

    const { status, output } = classifyWith(policy, ["vault/keys.md", "vault/readme.txt", "notes.md", "src/app.ts"]);

    expect(status).toBe(0);
    expect(output).toMatch(/high\s+vault\/keys\.md/);
    expect(output).toMatch(/low\s+vault\/readme\.txt/);
    expect(output).toMatch(/low\s+notes\.md/);
    expect(output).toMatch(/medium\s+src\/app\.ts/);
    expect(output).toContain("tier=high");
  });

  test("rejects a rule with an unknown tier instead of classifying", () => {
    const { status, output } = classifyWith("rules:\n  - critical  deploy/*\n", ["deploy/kube/prod.yaml"]);

    expect(status).not.toBe(0);
    expect(output).toContain("critical");
    expect(output).not.toContain("tier=");
  });

  test("rejects a rule outside the rules list instead of classifying", () => {
    const { status, output } = classifyWith("high  deploy/*\nrules:\n  - low  docs/*\n", ["deploy/kube/prod.yaml"]);

    expect(status).not.toBe(0);
    expect(output).toContain(":1:");
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
          RISK_TIER_POLICY: resolve(rootPath, ".github/risk-assessment.yml"),
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

describe(".github/risk-assessment.yml", () => {
  test("is YAML whose rules list holds one '<tier> <glob>' item per rule", () => {
    const assessment = Bun.YAML.parse(readFileSync(resolve(rootPath, ".github/risk-assessment.yml"), "utf8")) as {
      rules: unknown[];
    };

    expect(assessment.rules.length).toBeGreaterThan(0);

    for (const rule of assessment.rules) {
      expect(rule).toMatch(/^(low|medium|high)\s+\S+$/);
    }
  });
});

describe("docs/risk-tiers.md", () => {
  test("documents every tier the classifier can report", () => {
    const doc = readFileSync(docPath, "utf8");

    for (const tier of ["low", "medium", "high"]) {
      expect(doc).toMatch(new RegExp(`^#+ .*\\b${tier}\\b`, "im"));
    }
  });

  test("gives a local command that passes paths NUL-terminated", () => {
    expect(readFileSync(docPath, "utf8")).toContain("git diff -z --name-only --no-renames origin/main...HEAD | scripts/tier-classify.sh -z");
  });
});
