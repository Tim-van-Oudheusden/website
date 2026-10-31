import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const workflowPath = resolve(rootPath, ".github/workflows/ci.yml");
const guardScript = resolve(rootPath, "scripts/draft-leak-guard.sh");

interface Step {
  "name"?: string;
  "run"?: string;
  "timeout-minutes"?: number;
}

interface Workflow {
  jobs: Record<string, { "timeout-minutes": number; "steps": Step[] }>;
}

const workflow = Bun.YAML.parse(readFileSync(workflowPath, "utf8")) as Workflow;

function requireBinary(name: string): string {
  const path = Bun.which(name);

  if (path === null) {
    throw new Error(`${name} not found on PATH`);
  }

  return path;
}

// Resolved up front: the steps run with PATH limited to the stubs.
const bash = requireBinary("bash");
const seq = requireBinary("seq");
const grep = requireBinary("grep");

function findStep(job: string, name: string): Step {
  const step = workflow.jobs[job]?.steps.find((candidate) => candidate.name === name);

  if (step === undefined) {
    throw new Error(`ci.yml job ${job} has no step named ${name}`);
  }

  return step;
}

let stubDir: string;
let callLog: string;

// Each stub records its argv to the call log; STUB_FAIL_<NAME>=1 makes it exit 1.
function writeStub(name: string): void {
  const stubPath = join(stubDir, name);

  writeFileSync(
    stubPath,
    `#!${bash}\necho "${name} $*" >> "${callLog}"\n[ "\${STUB_FAIL_${name.toUpperCase()}:-0}" = 1 ] && exit 1\nexit 0\n`,
  );

  chmodSync(stubPath, 0o755);
}

// Runs a step's script the way GitHub does (`bash -e`), with PATH limited to the
// stubs so a podman installed on the test host cannot leak in.
function runStep(
  step: Step,
  env: Record<string, string> = {},
  cwd?: string,
): { status: number | null; calls: string[] } {
  const result = spawnSync(bash, ["-e", "-c", step.run ?? ""], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, PATH: stubDir, ...env },
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n").filter(Boolean);

  return { status: result.status, calls };
}

beforeEach(() => {
  stubDir = mkdtempSync(join(tmpdir(), "ci-workflow-"));
  callLog = join(stubDir, "calls.log");
  writeFileSync(callLog, "");
  symlinkSync(seq, join(stubDir, "seq"));
});

afterEach(() => {
  rmSync(stubDir, { recursive: true, force: true });
});

describe(".github/workflows/ci.yml", () => {
  test("gives every step that waits on the network its own timeout below the job's", () => {
    for (const [job, name] of [
      ["e2e", "Install Podman"],
      ["e2e", "Install Playwright browsers"],
      ["e2e", "Wait for services"],
      ["prod-assets", "Install Podman"],
      ["release", "Install Podman"],
    ] as const) {
      const stepTimeout = findStep(job, name)["timeout-minutes"];

      expect(stepTimeout, `${job} → ${name}`).toBeNumber();
      expect(stepTimeout, `${job} → ${name}`).toBeLessThan(workflow.jobs[job]?.["timeout-minutes"] ?? 0);
    }
  });

  test("Wait for services bounds every poll, so a service that accepts but never answers still ends in a pod log dump", () => {
    for (const name of ["curl", "podman", "sleep"]) {
      writeStub(name);
    }

    const step = findStep("e2e", "Wait for services");
    const { status, calls } = runStep(step, { STUB_FAIL_CURL: "1" });
    const curlCalls = calls.filter((call) => call.startsWith("curl "));

    expect(status).not.toBe(0);
    expect(curlCalls).toHaveLength(60);
    expect(new Set(curlCalls)).toEqual(new Set(["curl -fsS --max-time 5 http://localhost:3001/health"]));
    expect(calls.at(-1)).toBe("podman pod logs website");

    // Worst case: 60 polls × (5 s + 5 s curl caps + 5 s sleep) = 15 min; the step
    // timeout must leave room for that and the log dump.
    expect(step["timeout-minutes"]).toBeGreaterThan(15);
  });

  describe.each(["e2e", "prod-assets", "release"])("%s → Install Podman", (job) => {
    test("uses the runner's podman without touching apt", () => {
      for (const name of ["podman", "sudo"]) {
        writeStub(name);
      }

      const { status, calls } = runStep(findStep(job, "Install Podman"));

      expect(status).toBe(0);
      expect(calls).toEqual(["podman --version"]);
    });

    test("installs podman through apt with bounded retries when the runner lacks it", () => {
      writeStub("sudo");

      const { status, calls } = runStep(findStep(job, "Install Podman"));
      const aptOptions = "-o Acquire::Retries=3 -o Acquire::http::Timeout=30 -o Acquire::https::Timeout=30";

      expect(status).toBe(0);

      expect(calls).toEqual([
        `sudo apt-get ${aptOptions} update`,
        `sudo apt-get ${aptOptions} install -y podman`,
      ]);
    });
  });

  describe("release → Draft leak guard", () => {
    function runGuard(draftLine: string): number | null {
      const repoDir = join(stubDir, "repo");

      mkdirSync(join(repoDir, "content"), { recursive: true });
      mkdirSync(join(repoDir, "scripts"));
      writeFileSync(join(repoDir, "content", "Unfinished.md"), `---\ntitle: Unfinished\n${draftLine}\n---\n`);
      symlinkSync(guardScript, join(repoDir, "scripts", "draft-leak-guard.sh"));
      symlinkSync(bash, join(stubDir, "bash"));
      symlinkSync(grep, join(stubDir, "grep"));

      return runStep(findStep("release", "Draft leak guard"), {}, repoDir).status;
    }

    // The front-matter parser drops a trailing ` # comment` from an unquoted
    // value, so `draft: true # wip` is a draft; `true#wip` is the string "true#wip".
    // It also trims a key's leading indent, so ` draft: true` is a top-level draft.
    test.each(["draft: true", "draft: true # not ready yet", "draft: true\t# wip", "draft: true \r", " draft: true", "\tdraft: true # wip"])(
      "refuses to release a draft line the parser reads as true: %p",
      (line) => {
        expect(runGuard(line)).toBe(1);
      },
    );

    test.each(["draft: false", "draft: true#wip"])("releases a draft value the parser does not read as true: %p", (line) => {
      expect(runGuard(line)).toBe(0);
    });
  });
});
