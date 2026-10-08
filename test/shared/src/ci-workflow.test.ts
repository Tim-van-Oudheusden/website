import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const workflowPath = resolve(import.meta.dirname, "../../../.github/workflows/ci.yml");

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
function runStep(step: Step, env: Record<string, string> = {}): { status: number | null; calls: string[] } {
  const result = spawnSync(bash, ["-e", "-c", step.run ?? ""], {
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
});
