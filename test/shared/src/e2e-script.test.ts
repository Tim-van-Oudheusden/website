import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/e2e.sh");

let stubDir: string;
let callLog: string;

// Each stub records its argv to the call log; STUB_FAIL_<NAME>=1 makes it exit 1.
function writeStub(name: string): void {
  const stubPath = join(stubDir, name);

  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash\necho "${name} $*" >> "${callLog}"\n[ "\${STUB_FAIL_${name.toUpperCase()}:-0}" = 1 ] && exit 1\nexit 0\n`,
  );

  chmodSync(stubPath, 0o755);
}

function runScript(env: Record<string, string> = {}): { status: number | null; calls: string[] } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: rootPath,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      E2E_WAIT_INTERVAL: "0",
      ...env,
    },
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n");

  return { status: result.status, calls };
}

beforeEach(() => {
  stubDir = mkdtempSync(join(tmpdir(), "e2e-script-"));
  callLog = join(stubDir, "calls.log");
  writeFileSync(callLog, "");

  for (const name of ["podman", "curl", "bun"]) {
    writeStub(name);
  }
});

afterEach(() => {
  rmSync(stubDir, { recursive: true, force: true });
});

describe("scripts/e2e.sh", () => {
  test("reproduces the CI e2e job: build dev images, play pod, wait, test, tear down", () => {
    const { status, calls } = runScript();

    expect(status).toBe(0);

    expect(calls).toEqual([
      "podman build -f front-end/Dockerfile --target dev -t localhost/website/front-end:dev .",
      "podman build -f back-end/Dockerfile --target dev -t localhost/website/back-end:dev .",
      "podman kube play deploy/kube/dev.yaml",
      "curl -fsS --max-time 5 http://localhost:3001/health",
      "curl -fsS --max-time 5 http://localhost:5173/",
      "bun run test:e2e",
      "podman kube down deploy/kube/dev.yaml",
    ]);
  });

  test("still tears the pod down and exits non-zero when the e2e suite fails", () => {
    const { status, calls } = runScript({ STUB_FAIL_BUN: "1" });

    expect(status).not.toBe(0);
    expect(calls.at(-2)).toBe("bun run test:e2e");
    expect(calls.at(-1)).toBe("podman kube down deploy/kube/dev.yaml");
  });

  test("gives up after the configured polls, dumps pod logs, skips tests, and tears down", () => {
    const { status, calls } = runScript({ STUB_FAIL_CURL: "1", E2E_WAIT_ATTEMPTS: "3" });

    expect(status).not.toBe(0);
    expect(calls.filter((call) => call === "curl -fsS --max-time 5 http://localhost:3001/health")).toHaveLength(3);
    expect(calls).not.toContain("bun run test:e2e");

    expect(calls.slice(-2)).toEqual([
      "podman pod logs website",
      "podman kube down deploy/kube/dev.yaml",
    ]);
  });

  test("bounds every readiness poll so a service that accepts but never answers cannot hang the run", () => {
    const { calls } = runScript({ E2E_CURL_MAX_TIME: "2" });

    expect(calls.filter((call) => call.startsWith("curl "))).toEqual([
      "curl -fsS --max-time 2 http://localhost:3001/health",
      "curl -fsS --max-time 2 http://localhost:5173/",
    ]);
  });
});
