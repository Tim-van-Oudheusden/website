import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/quality-report.sh");

let stubDir: string;

// Stub `bun`: `bun run <gate>` exits 1 when STUB_FAIL_<GATE>=1; `bun test … --coverage`
// prints a Bun-style coverage table whose numbers depend on the workspace it runs in.
function writeBunStub(): void {
  const stubPath = join(stubDir, "bun");

  writeFileSync(
    stubPath,
    `#!/usr/bin/env bash
if [ "$1" = run ]; then
  var="STUB_FAIL_$(printf '%s' "$2" | tr '[:lower:]-' '[:upper:]_')"
  [ "\${!var:-0}" = 1 ] && exit 1
  exit 0
fi
if [ "$(basename "$PWD")" = "\${STUB_BROKEN_WORKSPACE:-}" ]; then
  echo "error: 1 test failed"
  exit 1
fi
case "$(basename "$PWD")" in
  back-end) funcs=97.50; lines=93.10 ;;
  shared) funcs=100.00; lines=98.25 ;;
  front-end) funcs=92.00; lines=91.40 ;;
esac
echo "---------------------|---------|---------|-------------------"
echo "File                 | % Funcs | % Lines | Uncovered Line #s"
echo "---------------------|---------|---------|-------------------"
echo "All files            |  $funcs |  $lines |"
exit 0
`,
  );

  chmodSync(stubPath, 0o755);
}

function runScript(env: Record<string, string> = {}): { status: number | null; report: string } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: rootPath,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      GITHUB_SHA: "abc1234",
      ...env,
    },
  });

  return { status: result.status, report: result.stdout };
}

beforeEach(() => {
  stubDir = mkdtempSync(join(tmpdir(), "quality-report-"));
  writeBunStub();
});

afterEach(() => {
  rmSync(stubDir, { recursive: true, force: true });
});

describe("scripts/quality-report.sh", () => {
  test("reports every gate as passing and each workspace's coverage as a Markdown table", () => {
    const { status, report } = runScript();

    expect(status).toBe(0);
    expect(report).toContain("# Quality report");
    expect(report).toContain("abc1234");
    expect(report).toContain("| `bun run lint` | ✅ pass |");
    expect(report).toContain("| `bun run typecheck` | ✅ pass |");
    expect(report).toContain("| `bun run test` | ✅ pass |");
    expect(report).toContain("| `bun run build` | ✅ pass |");
    expect(report).toContain("| back-end | 97.50% | 93.10% |");
    expect(report).toContain("| shared | 100.00% | 98.25% |");
    expect(report).toContain("| front-end | 92.00% | 91.40% |");
  });

  test("marks a failing gate, still runs the remaining gates, and exits non-zero", () => {
    const { status, report } = runScript({ STUB_FAIL_LINT: "1" });

    expect(status).not.toBe(0);
    expect(report).toContain("| `bun run lint` | ❌ fail |");
    expect(report).toContain("| `bun run build` | ✅ pass |");
    expect(report).toContain("| front-end | 92.00% | 91.40% |");
  });

  test("reports n/a and exits non-zero when a workspace's coverage run fails", () => {
    const { status, report } = runScript({ STUB_BROKEN_WORKSPACE: "shared" });

    expect(status).not.toBe(0);
    expect(report).toContain("| shared | ❌ n/a | ❌ n/a |");
    expect(report).toContain("| front-end | 92.00% | 91.40% |");
  });
});
