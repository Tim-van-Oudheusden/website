import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/auto-qa-tuner.ts");

let workDir: string;
let configPath: string;
let reportPath: string;

interface Floors {
  functions: number;
  lines: number;
}

function writeConfig(margin: number, floors: Record<string, Floors>): void {
  writeFileSync(configPath, `${JSON.stringify({ margin, floors }, null, 2)}\n`);
}

// Coverage rows in the format scripts/quality-report.sh prints.
function writeReport(rows: string[]): void {
  writeFileSync(
    reportPath,
    [
      "## Unit-test coverage",
      "",
      "| Workspace | Functions | Lines |",
      "| --------- | --------- | ----- |",
      ...rows,
      "",
    ].join("\n"),
  );
}

function runTuner(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [scriptPath, "--config", configPath, "--report", reportPath, ...args],
    { cwd: rootPath, encoding: "utf8" },
  );

  return { status: result.status, stdout: result.stdout, stderr: result.stderr };
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "auto-qa-tuner-"));
  configPath = join(workDir, "auto-qa-tuning.json");
  reportPath = join(workDir, "quality-report.md");
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

describe("scripts/auto-qa-tuner.ts", () => {
  test("proposes raising a floor to the observed coverage minus the margin, rounded down", () => {
    writeConfig(2, { "back-end": { functions: 95, lines: 90 } });
    writeReport(["| back-end | 99.12% | 96.03% |"]);

    const { status, stdout } = runTuner();

    expect(status).toBe(0);
    expect(stdout).toContain("| back-end | functions | 95% | 99.12% | 97% ⬆️ |");
    expect(stdout).toContain("| back-end | lines | 90% | 96.03% | 94% ⬆️ |");
  });

  test("never proposes lowering a floor, even when coverage has dropped below it", () => {
    writeConfig(2, { shared: { functions: 90, lines: 90 } });
    writeReport(["| shared | 91.50% | 85.00% |"]);

    const { status, stdout } = runTuner();

    expect(status).toBe(0);
    expect(stdout).toContain("| shared | functions | 90% | 91.50% | 90% |");
    expect(stdout).toContain("| shared | lines | 90% | 85.00% | 90% |");
  });

  test("keeps a workspace's floors when the report has no coverage for it", () => {
    writeConfig(2, {
      "shared": { functions: 90, lines: 90 },
      "front-end": { functions: 91, lines: 91 },
    });

    writeReport(["| shared | ❌ n/a | ❌ n/a |"]);

    const { status, stdout } = runTuner();

    expect(status).toBe(0);
    expect(stdout).toContain("| shared | functions | 90% | n/a | 90% |");
    expect(stdout).toContain("| front-end | lines | 91% | n/a | 91% |");
  });

  test("writes the proposed floors back to the config only with --write", () => {
    writeConfig(2, {
      "back-end": { functions: 95, lines: 90 },
      "shared": { functions: 90, lines: 90 },
    });

    writeReport(["| back-end | 99.12% | 96.03% |", "| shared | ❌ n/a | ❌ n/a |"]);
    const original = readFileSync(configPath, "utf8");

    expect(runTuner().status).toBe(0);
    expect(readFileSync(configPath, "utf8")).toBe(original);

    expect(runTuner("--write").status).toBe(0);

    expect(JSON.parse(readFileSync(configPath, "utf8"))).toEqual({
      margin: 2,
      floors: {
        "back-end": { functions: 97, lines: 94 },
        "shared": { functions: 90, lines: 90 },
      },
    });
  });
});
