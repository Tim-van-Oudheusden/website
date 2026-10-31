#!/usr/bin/env bun
// PR acceptance metric, as a Markdown table: of the PRs closed in a window, how
// many were merged and how many closed without merging, per source (a Hive
// agent, Claude Code in CI, Dependabot, or other; the AI audit trail's rule in
// scripts/pr-source.ts).
//
// Usage:
//   bun scripts/pr-metrics.ts <since YYYY-MM-DD> <prs.json>
//
// <prs.json> is `gh pr list --state closed --search "closed:>=<since>" --json
// headRefName,mergedAt,body`; <since> only labels the report. Exits 1 if
// the input can't be read, 2 on bad usage.
import { readFileSync } from "node:fs";

import { attribute, SOURCES } from "./pr-source";

interface PullRequest {
  headRefName: string;
  mergedAt: string | null;
  body: string;
}

function row(label: string, prs: PullRequest[]): string {
  const total = prs.length;
  const merged = prs.filter((pr) => pr.mergedAt !== null).length;
  const acceptance = total === 0 ? "n/a" : `${Math.round((merged * 1000) / total) / 10}%`;

  return `| ${label} | ${total} | ${merged} | ${total - merged} | ${acceptance} |`;
}

const [since, prsPath] = process.argv.slice(2);

if (since === undefined || prsPath === undefined) {
  console.error("usage: bun scripts/pr-metrics.ts <since YYYY-MM-DD> <prs.json>");
  process.exit(2);
}

const prs = JSON.parse(readFileSync(prsPath, "utf8")) as PullRequest[];

process.stdout.write(`${[
  "## PR acceptance metric",
  "",
  `PRs closed from ${since} to now.`,
  "",
  "| Source | Closed | Merged | Rejected | Acceptance |",
  "| --- | ---: | ---: | ---: | ---: |",
  ...SOURCES.map((source) => row(source, prs.filter((pr) => attribute(pr).source === source))),
  row("**All**", prs),
].join("\n")}\n`);
