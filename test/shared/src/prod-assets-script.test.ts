import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/prod-assets.sh");

let stubDir: string;
let callLog: string;

function writeStub(name: string, body: string): void {
  const stubPath = join(stubDir, name);

  writeFileSync(stubPath, `#!/usr/bin/env bash\necho "${name} $*" >> "${callLog}"\n${body}\n`);
  chmodSync(stubPath, 0o755);
}

function runScript(env: Record<string, string> = {}): { status: number | null; calls: string[] } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: rootPath,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      PROD_ASSETS_WAIT_INTERVAL: "0",
      ...env,
    },
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n");

  return { status: result.status, calls };
}

// The value after --max-time, or undefined when the request is unbounded.
function maxTimeOf(call: string): string | undefined {
  const args = call.split(" ");
  const index = args.indexOf("--max-time");

  return index === -1 ? undefined : args[index + 1];
}

function countPublicAssets(dir: string): number {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .reduce((count, entry) => count + (entry.isDirectory() ? countPublicAssets(join(dir, entry.name)) : 1), 0);
}

beforeEach(() => {
  stubDir = mkdtempSync(join(tmpdir(), "prod-assets-script-"));
  callLog = join(stubDir, "calls.log");
  writeFileSync(callLog, "");

  writeStub("podman", "exit 0");

  // Serves the repo's public/ like a healthy prod image; STUB_FAIL_CURL=1 never answers.
  writeStub(
    "curl",
    [
      `[ "\${STUB_FAIL_CURL:-0}" = 1 ] && exit 28`,
      `out=""; url=""`,
      `while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift 2;; *) url="$1"; shift;; esac; done`,
      `[ "$out" = /dev/null ] || cp "public/\${url#http://*/}" "$out"`,
    ].join("\n"),
  );
});

afterEach(() => {
  rmSync(stubDir, { recursive: true, force: true });
});

describe("scripts/prod-assets.sh", () => {
  test("bounds every readiness poll by default, so an image that accepts but never answers ends in a log dump", () => {
    const { status, calls } = runScript({ STUB_FAIL_CURL: "1", PROD_ASSETS_WAIT_ATTEMPTS: "3" });
    const curlCalls = calls.filter((call) => call.startsWith("curl "));

    expect(status).not.toBe(0);
    expect(curlCalls).toHaveLength(3);

    for (const call of curlCalls) {
      expect(Number(maxTimeOf(call)), call).toBeGreaterThan(0);
    }

    expect(calls.slice(-2)).toEqual(["podman logs website-prod-assets", "podman rm -f website-prod-assets"]);
  });

  test("caps the readiness poll and every asset fetch at PROD_ASSETS_CURL_MAX_TIME", () => {
    const { status, calls } = runScript({ PROD_ASSETS_CURL_MAX_TIME: "2" });
    const curlCalls = calls.filter((call) => call.startsWith("curl "));

    expect(status).toBe(0);
    // One readiness poll, then one fetch per public/ asset.
    expect(curlCalls).toHaveLength(1 + countPublicAssets(resolve(rootPath, "public")));
    expect(curlCalls.map(maxTimeOf)).toEqual(curlCalls.map(() => "2"));
  });
});
