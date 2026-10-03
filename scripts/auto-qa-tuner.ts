#!/usr/bin/env bun
// Self-tune the unit-test coverage floors from observed coverage.
//
// Usage:
//   bun scripts/auto-qa-tuner.ts [--config <path>] [--report <path>] [--write]
//
// Reads the floors from the tuning config (default .github/auto-qa-tuning.json)
// and the observed coverage from a scripts/quality-report.sh report (default
// quality-report.md), then prints a Markdown table proposing, per workspace and
// metric, the floor raised to the observed coverage minus the config's margin,
// rounded down to a whole percent. Floors are never lowered. With --write the
// proposed floors are saved back to the config.
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

type Metric = "functions" | "lines";

interface Floors {
  functions: number;
  lines: number;
}

interface TuningConfig {
  margin: number;
  floors: Record<string, Floors>;
}

const metrics: Metric[] = ["functions", "lines"];

const { values } = parseArgs({
  options: {
    config: { type: "string", default: ".github/auto-qa-tuning.json" },
    report: { type: "string", default: "quality-report.md" },
    write: { type: "boolean", default: false },
  },
});

const config = JSON.parse(readFileSync(values.config, "utf8")) as TuningConfig;
const report = readFileSync(values.report, "utf8");

// Rows look like `| back-end | 97.50% | 93.10% |`.
const observed = new Map<string, Floors>();
for (const [, workspace, functions, lines] of report.matchAll(
  /^\| (\S+) \| ([\d.]+)% \| ([\d.]+)% \|$/gm,
)) {
  if (workspace && functions && lines) {
    observed.set(workspace, { functions: Number(functions), lines: Number(lines) });
  }
}

// Floors only ratchet up. Work in hundredths so float error cannot push a
// value below a whole percent.
function proposeFloor(floor: number, coverage: number, margin: number): number {
  const candidate = Math.floor(Math.round((coverage - margin) * 100) / 100);
  return Math.max(floor, candidate);
}

const output = [
  "## Coverage floor tuning",
  "",
  `Margin: ${config.margin} percentage points below observed coverage.`,
  "",
  "| Workspace | Metric | Floor | Observed | Proposed |",
  "| --------- | ------ | ----- | -------- | -------- |",
];
const tuned: Record<string, Floors> = {};
for (const [workspace, floors] of Object.entries(config.floors)) {
  // A failed coverage run (n/a) or a missing row gives no data: keep the floor.
  const coverage = observed.get(workspace);
  const next = { ...floors };
  tuned[workspace] = next;
  for (const metric of metrics) {
    const floor = floors[metric];
    if (!coverage) {
      output.push(`| ${workspace} | ${metric} | ${floor}% | n/a | ${floor}% |`);
      continue;
    }
    const proposed = proposeFloor(floor, coverage[metric], config.margin);
    next[metric] = proposed;
    const marker = proposed > floor ? " ⬆️" : "";
    output.push(
      `| ${workspace} | ${metric} | ${floor}% | ${coverage[metric].toFixed(2)}% | ${proposed}%${marker} |`,
    );
  }
}
process.stdout.write(`${output.join("\n")}\n`);

if (values.write) {
  writeFileSync(values.config, `${JSON.stringify({ ...config, floors: tuned }, null, 2)}\n`);
}
