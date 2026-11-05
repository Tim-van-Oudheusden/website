import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");

let workDir: string;
let stubDir: string;
let fixtureRoot: string;
let callLog: string;

function writeStub(name: string, body: string): void {
  const stubPath = join(stubDir, name);

  writeFileSync(stubPath, `#!/usr/bin/env bash\necho "${name} $*" >> "${callLog}"\n${body}\n`);
  chmodSync(stubPath, 0o755);
}

interface Run {
  status: number | null;
  calls: string[];
  stdout: string;
  stderr: string;
}

// The script checks the `public/` beside its own `scripts/`, so a copy of it in
// a fixture checks the fixture's files. It runs from another directory, as only
// its own `cd` can then find them.
function runScript(env: Record<string, string> = {}): Run {
  const result = spawnSync("bash", [join(fixtureRoot, "scripts/prod-assets.sh")], {
    cwd: workDir,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      ...env,
    },
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n");

  return { status: result.status, calls, stdout: result.stdout, stderr: result.stderr };
}

function curlCalls(calls: string[]): string[] {
  return calls.filter((call) => call.startsWith("curl "));
}

// The value after --max-time, or undefined when the request is unbounded.
function maxTimeOf(call: string): string | undefined {
  const args = call.split(" ");
  const index = args.indexOf("--max-time");

  return index === -1 ? undefined : args[index + 1];
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "prod-assets-script-"));
  stubDir = join(workDir, "bin");
  fixtureRoot = join(workDir, "repo");
  callLog = join(workDir, "calls.log");
  writeFileSync(callLog, "");
  mkdirSync(stubDir);
  mkdirSync(join(fixtureRoot, "scripts"), { recursive: true });
  mkdirSync(join(fixtureRoot, "public/icons"), { recursive: true });
  copyFileSync(resolve(rootPath, "scripts/prod-assets.sh"), join(fixtureRoot, "scripts/prod-assets.sh"));
  writeFileSync(join(fixtureRoot, "public/robots.txt"), "User-agent: *\n");
  writeFileSync(join(fixtureRoot, "public/icons/logo.svg"), "<svg/>\n");
  writeFileSync(join(fixtureRoot, "public/.gitkeep"), "");

  writeStub("podman", `[ "$1" = "\${STUB_FAIL_PODMAN:-}" ] && exit 1\nexit 0`);
  writeStub("sleep", "exit 0");

  // Serves the fixture's public/ like a healthy prod image. STUB_FAIL_CURL=1 never
  // answers; STUB_READY_500=1 answers the readiness poll with a 500; STUB_SPA_FALLBACK
  // names a URL path answered with index.html and a 200, as the prod server does
  // for a file it does not have (#480).
  writeStub(
    "curl",
    [
      `[ "\${STUB_FAIL_CURL:-0}" = 1 ] && exit 28`,
      `out=""; url=""; fail=0`,
      `while [ $# -gt 0 ]; do case "$1" in -o) out="$2"; shift 2;; -f*) fail=1; shift;; *) url="$1"; shift;; esac; done`,
      `if [ "$out" = /dev/null ]; then`,
      `  [ "\${STUB_READY_500:-0}" = 1 ] && [ "$fail" = 1 ] && exit 22`,
      `  exit 0`,
      `fi`,
      `path="/\${url#http://*/}"`,
      `if [ "$path" = "\${STUB_SPA_FALLBACK:-}" ]; then echo "<!doctype html>" > "$out"; exit 0; fi`,
      `cp "public$path" "$out"`,
    ].join("\n"),
  );
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/prod-assets.sh", () => {
  test("bounds every readiness poll by default, so an image that accepts but never answers ends in a log dump", () => {
    const { status, calls, stderr } = runScript({ STUB_FAIL_CURL: "1", PROD_ASSETS_WAIT_ATTEMPTS: "3" });

    expect(status).not.toBe(0);
    expect(stderr).toContain("front-end did not become ready");
    expect(curlCalls(calls)).toHaveLength(3);

    for (const call of curlCalls(calls)) {
      expect(Number(maxTimeOf(call)), call).toBeGreaterThan(0);
    }

    expect(calls.slice(-2)).toEqual(["podman logs website-prod-assets", "podman rm -f website-prod-assets"]);
  });

  test("caps the readiness poll and every asset fetch at PROD_ASSETS_CURL_MAX_TIME", () => {
    const { status, calls } = runScript({ PROD_ASSETS_CURL_MAX_TIME: "2" });

    expect(status).toBe(0);
    // One readiness poll, then one fetch per asset; the dotfile is not an asset.
    expect(curlCalls(calls)).toHaveLength(3);
    expect(curlCalls(calls).map(maxTimeOf)).toEqual(["2", "2", "2"]);
  });

  test("builds the prod image and publishes it on a loopback port", () => {
    const { calls } = runScript({ PROD_ASSETS_PORT: "18555" });

    expect(calls.slice(0, 2)).toEqual([
      "podman build -f front-end/Dockerfile --target prod -t localhost/website/front-end:prod-assets .",
      "podman run -d --name website-prod-assets -p 127.0.0.1:18555:3000 localhost/website/front-end:prod-assets",
    ]);
  });

  test("asks for each asset at its path under the site root and says how many it checked", () => {
    const { status, calls, stdout } = runScript();

    expect(status).toBe(0);

    expect(curlCalls(calls).map((call) => call.split(" ").at(-1))).toEqual([
      "http://127.0.0.1:18300/",
      "http://127.0.0.1:18300/icons/logo.svg",
      "http://127.0.0.1:18300/robots.txt",
    ]);

    expect(stdout).toContain("all 2 public/ assets served by the prod image");
  });

  // The whole reason this script exists: the prod server answers a file it does
  // not have with index.html and a 200, so only the bytes can tell (#480).
  test("fails on a file answered with index.html and a 200, and still checks the rest", () => {
    const { status, stdout, stderr, calls } = runScript({ STUB_SPA_FALLBACK: "/icons/logo.svg" });

    expect(status).not.toBe(0);
    expect(stderr).toContain("FAIL /icons/logo.svg (not served byte-identical to public/icons/logo.svg)");
    expect(stdout).toContain("ok   /robots.txt");
    expect(stdout).not.toContain("all 2 public/ assets");
    expect(calls.at(-1)).toBe("podman rm -f website-prod-assets");
  });

  test("does not pass an image that has nothing to check", () => {
    rmSync(join(fixtureRoot, "public/robots.txt"));
    rmSync(join(fixtureRoot, "public/icons/logo.svg"));

    const { status, stderr } = runScript();

    expect(status).not.toBe(0);
    expect(stderr).toContain("no public/ assets found to check");
  });

  test("keeps polling past a readiness answer that is an HTTP error", () => {
    const { status, calls } = runScript({ STUB_READY_500: "1", PROD_ASSETS_WAIT_ATTEMPTS: "2" });

    expect(status).not.toBe(0);
    expect(curlCalls(calls)).toHaveLength(2);
    expect(calls).toContain("podman logs website-prod-assets");
  });

  test("waits PROD_ASSETS_WAIT_INTERVAL seconds after each failed poll", () => {
    const { calls } = runScript({
      STUB_FAIL_CURL: "1",
      PROD_ASSETS_WAIT_ATTEMPTS: "2",
      PROD_ASSETS_WAIT_INTERVAL: "7",
    });

    expect(calls.filter((call) => call.startsWith("sleep "))).toEqual(["sleep 7", "sleep 7"]);
  });

  test("stops when the image does not build, and starts nothing", () => {
    const { status, calls } = runScript({ STUB_FAIL_PODMAN: "build" });

    expect(status).not.toBe(0);

    expect(calls).toEqual([
      "podman build -f front-end/Dockerfile --target prod -t localhost/website/front-end:prod-assets .",
    ]);
  });
});
