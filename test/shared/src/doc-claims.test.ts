import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Docs that enumerate something the code also defines (route groups, env vars,
// scripts, frontmatter keys) go stale silently when the code grows (#721, #776,
// #818, #928). Each test here derives the list from the code and requires the
// doc to name exactly that list, so code and docs change in the same PR.

const ROOT = resolve(import.meta.dirname, "../../..");

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
};

function readRootFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

function sorted(values: Iterable<string>): string[] {
  return [...new Set(values)].sort();
}

function matchAll(text: string, pattern: RegExp): string[] {
  return [...text.matchAll(pattern)].map((match) => match[1] ?? "");
}

/** Text from `heading` (a whole line) to the next heading of the same or a higher level. */
function section(text: string, heading: string): string {
  const lines = text.split("\n");
  const start = lines.indexOf(heading);

  if (start === -1) {
    throw new Error(`heading not found: ${heading}`);
  }

  const level = /^#+/.exec(heading)?.[0].length ?? 0;
  const end = lines.findIndex(
    (line, index) => index > start && /^#+ /.test(line) && (/^#+/.exec(line)?.[0].length ?? 0) <= level,
  );

  return lines.slice(start + 1, end === -1 ? undefined : end).join("\n");
}

/** Backticked names in the first column of every Markdown table row in `text`. */
function firstColumnNames(text: string): string[] {
  return text
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .flatMap((line) => matchAll(line.split("|")[1] ?? "", /`([^`]+)`/g));
}

function directoryNames(relativePath: string): string[] {
  return sorted(
    readdirSync(resolve(ROOT, relativePath), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name),
  );
}

function sourceFiles(relativePath: string): string[] {
  return readdirSync(resolve(ROOT, relativePath), { recursive: true, encoding: "utf8" })
    .filter((name) => name.endsWith(".ts"))
    .map((name) => readRootFile(`${relativePath}/${name}`));
}

/** The parenthesised list on the CONTRIBUTING "Project layout" line that starts with `prefix`. */
function layoutList(prefix: string): string[] {
  const layout = section(readRootFile("CONTRIBUTING.md"), "## Project layout");
  const line = layout.split("\n").find((candidate) => candidate.trimStart().startsWith(prefix));
  const list = /\(([^)]+)\)/.exec(line ?? "")?.[1];

  if (list === undefined) {
    throw new Error(`no "(a, b, …)" list on the CONTRIBUTING layout line starting with ${prefix}`);
  }

  return sorted(list.split(",").map((name) => name.trim()));
}

describe("CONTRIBUTING.md project layout", () => {
  test("lists every back-end route group under back-end/src/features/", () => {
    expect(layoutList("features/<name>/")).toEqual(directoryNames("back-end/src/features"));
  });

  test("lists every front-end area under front-end/src/features/", () => {
    expect(layoutList("src/features/<name>/")).toEqual(directoryNames("front-end/src/features"));
  });
});

describe("README.md back-end environment variables", () => {
  const doc = section(readRootFile("README.md"), "### Back-end environment variables");
  // NODE_ENV is the runtime's own switch, not a back-end setting; the README
  // covers it in the line under the table.
  const proseOnly = ["NODE_ENV"];
  const read = sorted(
    sourceFiles("back-end/src").flatMap((source) => [
      ...matchAll(source, /\benv\["([A-Z][A-Z0-9_]*)"\]/g),
      ...matchAll(source, /\benv\.([A-Z][A-Z0-9_]*)\b/g),
    ]),
  );

  test("table has one row per variable the back-end reads", () => {
    expect(sorted(firstColumnNames(doc))).toEqual(read.filter((name) => !proseOnly.includes(name)));
  });

  test("states the number of table rows", () => {
    const word = /reads (\w+) variables/.exec(doc)?.[1] ?? "";

    expect(NUMBER_WORDS[word]).toBe(firstColumnNames(doc).length);
  });

  test("mentions the variables documented outside the table", () => {
    for (const name of proseOnly.filter((candidate) => read.includes(candidate))) {
      expect(doc).toContain(`\`${name}`);
    }
  });
});

describe("README.md scripts table", () => {
  test("names every script in the root package.json, and no other", () => {
    const packageJson = JSON.parse(readRootFile("package.json")) as { scripts: Record<string, string> };
    const table = section(readRootFile("README.md"), "## Scripts");

    expect(sorted(matchAll(table, /`bun run ([\w:-]+)`/g))).toEqual(sorted(Object.keys(packageJson.scripts)));
  });
});

describe("docs/content-authoring.md frontmatter reference", () => {
  test("tables name every frontmatter key back-end/src/features/content/ reads, and no other", () => {
    const reference = section(readRootFile("docs/content-authoring.md"), "### Frontmatter reference");
    const read = sourceFiles("back-end/src/features/content").flatMap((source) => matchAll(source, /\braw\["(\w+)"\]/g));

    expect(sorted(firstColumnNames(reference))).toEqual(sorted(read));
  });

  test("standalone page table names every key back-end/src/features/pages/pages.ts reads, and no other", () => {
    const table = section(readRootFile("docs/content-authoring.md"), "### Standalone pages (`content/pages/`)");
    const read = matchAll(readRootFile("back-end/src/features/pages/pages.ts"), /\bdata\["(\w+)"\]/g);

    expect(sorted(firstColumnNames(table))).toEqual(sorted(read));
  });
});

describe("docs/testing.md E2E tuning table", () => {
  test("names every E2E_* variable scripts/e2e.sh reads, and no other", () => {
    const tuning = section(section(readRootFile("docs/testing.md"), "## Run the E2E suite locally"), "### Tuning");
    const read = matchAll(readRootFile("scripts/e2e.sh"), /\$\{(E2E_[A-Z0-9_]+)/g);

    expect(sorted(firstColumnNames(tuning))).toEqual(sorted(read));
  });
});
