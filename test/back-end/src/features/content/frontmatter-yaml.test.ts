import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { readFrontmatter } from "../../../../../back-end/src/features/content/frontmatter";

// readFrontmatter is a hand-written YAML subset. Each time it read a line other
// than YAML would (#1026 dropped a tag, #1033 promoted a wrapped line to a key,
// #1035 did the same for a tab-indented line), it reported nothing and the
// content went out wrong. This checks it against the YAML reader built into Bun:
// for every input it must either reject the block or return what YAML returns.

const CONTENT_DIR = resolve(import.meta.dir, "../../../../../content");

/**
 * YAML's reading in the subset's terms. The subset has no null: a key with
 * nothing after its colon is an empty list at top level (so Obsidian's empty
 * `tags:` stays a list) and an empty string inside a list item.
 */
function withSubsetEmpties(value: unknown, depth: number): unknown {
  if (value === null) {
    return depth === 1 ? [] : "";
  }

  if (Array.isArray(value)) {
    return value.map((item: unknown) => withSubsetEmpties(item, depth + 1));
  }

  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, field]) => [key, withSubsetEmpties(field, depth + 1)]));
  }

  return value;
}

interface Misread {
  yaml: string;
  subset: unknown;
  bunYaml: unknown;
}

// YAML forbids tabs in indentation (YAML 1.2, 6.1), but Bun.YAML accepts a
// tab-indented line, reading `description: X` then `<tab>Note: Y` as two keys.
// A comment line may start with a tab.
const TAB_INDENTED_RE = /^[ \t]*\t[ \t]*[^\s#]/m;

/** The disagreement when readFrontmatter accepts `yaml` but YAML reads it otherwise, else null. */
function misreadOf(yaml: string): Misread | null {
  const read = readFrontmatter(`---\n${yaml}\n---\n`);

  if (!read.ok) {
    return null;
  }

  let bunYaml: unknown;

  try {
    bunYaml = TAB_INDENTED_RE.test(yaml) ? "YAML error: tab in indentation" : withSubsetEmpties(Bun.YAML.parse(yaml), 0);
  } catch (error) {
    bunYaml = `YAML error: ${String(error)}`;
  }

  return Bun.deepEquals(read.result.data, bunYaml, true) ? null : { yaml, subset: read.result.data, bunYaml };
}

function markdownFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);

    if (entry.isDirectory()) {
      return markdownFiles(path);
    }

    return entry.name.endsWith(".md") ? [path] : [];
  });
}

/** The lines between a file's opening `---` and the next `---` line. */
function frontmatterBlock(raw: string): string {
  const lines = raw.replace(/^\uFEFF/, "").split(/\r?\n/);
  const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");

  return lines.slice(1, end === -1 ? lines.length : end).join("\n");
}

// One line of each kind the subset meets. `position` keeps every key distinct,
// since YAML rejects a repeated key.
const LINE_KINDS: ((position: number) => string)[] = [
  (position) => `k${position}: v${position}`,
  (position) => `k${position}:`,
  (position) => `- v${position}`,
  (position) => `- k${position}: v${position}`,
  (position) => `-  k${position}: v${position}`,
  (position) => `wrapped words ${position}`,
  () => "# note",
];
const INDENTS = ["", " ", "  ", "   ", "    ", "\t", "  \t"];
const MAX_LINES = 3;

/** Every block of 1 to MAX_LINES lines, each line any kind at any indent. */
function generatedBlocks(): string[] {
  let blocks: string[][] = [[]];
  const all: string[] = [];

  for (let position = 0; position < MAX_LINES; position += 1) {
    const lines = LINE_KINDS.flatMap((kind) => INDENTS.map((indent) => indent + kind(position)));

    blocks = blocks.flatMap((block) => lines.map((line) => [...block, line]));
    all.push(...blocks.map((block) => block.join("\n")));
  }

  return all;
}

describe("readFrontmatter against Bun.YAML", () => {
  test.each(markdownFiles(CONTENT_DIR).map((file) => [relative(CONTENT_DIR, file), file]))(
    "reads %s as YAML does",
    (_name, file) => {
      expect(misreadOf(frontmatterBlock(readFileSync(file, "utf8")))).toBeNull();
    },
  );

  test(`rejects or reads as YAML does every block of up to ${String(MAX_LINES)} generated lines`, () => {
    const misreads = generatedBlocks().map(misreadOf).filter((misread) => misread !== null);

    expect({ count: misreads.length, first: misreads.slice(0, 10) }).toEqual({ count: 0, first: [] });
  });
});
