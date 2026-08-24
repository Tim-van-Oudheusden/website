/**
 * Minimal frontmatter parser.
 *
 * Parses the Jekyll-style `---`-delimited YAML-subset block used for Obsidian
 * content frontmatter. This is intentionally NOT a general YAML parser: it
 * covers only the flat schema this repository's content files use (scalars,
 * plain string lists, and a single level of nested object lists). It exists to
 * remove the `js-yaml` dependency (via gray-matter) and its associated
 * advisories (quadratic-CPU DoS via merge keys / `!!omap`, CVE-2026-59870).
 *
 * Supported subset:
 *   key: value                     scalar (string, boolean, number)
 *   tags:                          block list of strings
 *     - One
 *     - Two
 *   links:
 *     - type: repo
 *       label: Label
 *       href: https://example.com
 *
 * Returns the parsed data object plus the body after the closing `---`, or
 * null when no valid leading frontmatter block exists.
 */

type Scalar = string | number | boolean;

interface FrontmatterMap {
  [key: string]: Scalar | FrontmatterValue[] | FrontmatterMap;
}

type FrontmatterValue = Scalar | FrontmatterValue[] | FrontmatterMap;

const NUMERIC_RE = /^-?\d+$/;

function parseScalarValue(value: string): Scalar {
  const trimmed = value.trim();
  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }
  if (NUMERIC_RE.exec(trimmed) !== null) {
    return Number(trimmed);
  }
  return trimmed;
}

const FIELD_RE = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/;
const LIST_ITEM_RE = /^-(?:\s+(.*))?$/;

export interface ParseResult {
  data: FrontmatterMap;
  content: string;
}

const INDENT_RE = /^ +/;

function indentOf(line: string): number {
  return INDENT_RE.exec(line)?.[0].length ?? 0;
}

/**
 * Parse a block of indented child lines. Returns a string[] when every item is
 * a scalar, otherwise a list of objects.
 */
function parseBlockChildren(children: string[]): FrontmatterValue {
  const items: FrontmatterValue[] = [];
  let index = 0;

  while (index < children.length) {
    const line = children[index];
    if (line === undefined) {
      index += 1;
      continue;
    }

    const itemMatch = LIST_ITEM_RE.exec(line.trimStart());
    if (itemMatch === null) {
      index += 1;
      continue;
    }

    const itemIndent = indentOf(line);
    const rest = itemMatch[1] ?? "";

    // Plain scalar item: `- One` (no colon-field inside).
    const inlineField = FIELD_RE.exec(rest);
    if (inlineField === null) {
      items.push(parseScalarValue(rest));
      index += 1;
      continue;
    }

    // Object item: `- type: repo`, then deeper `key: value` siblings.
    const inlineKey = inlineField[1];
    if (inlineKey === undefined || inlineKey === "") {
      index += 1;
      continue;
    }
    const obj: FrontmatterMap = {
      [inlineKey]: parseScalarValue(inlineField[2] ?? ""),
    };

    let next = index + 1;
    while (next < children.length) {
      const sub = children[next];
      if (sub === undefined) {
        next += 1;
        break;
      }
      const subIndent = indentOf(sub);
      if (subIndent <= itemIndent) {
        break;
      }
      const subField = FIELD_RE.exec(sub.trimStart());
      if (subField !== null) {
        const subKey = subField[1];
        if (subKey !== undefined && subKey !== "") {
          obj[subKey] = parseScalarValue(subField[2] ?? "");
        }
      }
      next += 1;
    }

    items.push(obj);
    index = next;
  }

  return items;
}

export function parseFrontmatter(raw: string): ParseResult | null {
  if (!raw.startsWith("---")) {
    return null;
  }

  const lines = raw.split("\n");

  // Skip the opening `---`.
  let index = 1;
  const block: string[] = [];
  let closed = false;

  while (index < lines.length) {
    const line = lines[index];
    if (line === undefined) {
      break;
    }
    if (line.trim() === "---") {
      closed = true;
      index += 1;
      break;
    }
    block.push(line);
    index += 1;
  }

  if (!closed) {
    return null;
  }

  const content = lines.slice(index).join("\n");
  const data: FrontmatterMap = {};

  let i = 0;
  while (i < block.length) {
    const line = block[i];
    if (line === undefined) {
      i += 1;
      continue;
    }
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const indent = indentOf(line);
    const field = FIELD_RE.exec(line.trimStart());
    if (field === null) {
      i += 1;
      continue;
    }

    const key = field[1];
    if (key === undefined || key === "") {
      i += 1;
      continue;
    }
    const value = field[2] ?? "";

    // A key with a value: `title: X`.
    if (value.trim() !== "") {
      data[key] = parseScalarValue(value);
      i += 1;
      continue;
    }

    // A parent key (`tags:`, `links:`) consumes its indented block children.
    const children: string[] = [];
    let next = i + 1;
    while (next < block.length) {
      const child = block[next];
      if (child === undefined || indentOf(child) <= indent) {
        break;
      }
      children.push(child);
      next += 1;
    }
    data[key] = parseBlockChildren(children);
    i = next;
  }

  if (Object.keys(data).length === 0) {
    return null;
  }

  return { data, content };
}