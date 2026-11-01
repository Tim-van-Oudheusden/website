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
 *   tags:                          block list of strings; the items may
 *     - One                        also sit at the key's own indent
 *     - Two
 *   links:
 *     - type: repo
 *       label: Label
 *       href: https://example.com
 *
 * A scalar may be wrapped in "double" or 'single' quotes; the quotes are
 * removed and the value stays a string (`"true"` is not a boolean). Inside
 * double quotes `\"` and `\\` are decoded; inside single quotes `''` is. An
 * unquoted value loses a trailing ` # comment`. Flow lists (`[a, b]`),
 * multi-line scalars, and other YAML forms are not part of the subset.
 *
 * `readFrontmatter` returns the parsed data object plus the body after the
 * closing `---`, or the reason no valid leading frontmatter block exists. Every
 * line the subset does not recognise is such a reason, so it is reported
 * instead of dropped: a line under a block key that is not a `- ` item (or a
 * field of an object item), a top-level line that is not `key: value`, a line
 * indented under a key that has a value on its own line, and a line indented
 * with a tab or out of line with the lines it belongs with (a top-level key
 * left of the first key, a `- ` item off its list's indent, an object item's
 * field off its first field's column), which YAML would reject or read as
 * part of another value.
 *
 * A leading UTF-8 byte-order mark is ignored and frontmatter lines may end in
 * CRLF; the body keeps its original line endings.
 */

type Scalar = string | number | boolean;

interface FrontmatterMap {
  [key: string]: Scalar | FrontmatterValue[] | FrontmatterMap;
}

type FrontmatterValue = Scalar | FrontmatterValue[] | FrontmatterMap;

const NUMERIC_RE = /^-?\d+$/;
// YAML starts a comment at a `#` that opens the value or follows whitespace.
const COMMENT_RE = /(?:^|\s)#.*$/;
// A double- or single-quoted scalar, optionally followed by a comment. Inside
// double quotes `\"` and `\\` are escapes; inside single quotes `''` is.
const DOUBLE_QUOTED_RE = /^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/;
const DOUBLE_QUOTED_ESCAPE_RE = /\\(["\\])/g;
const SINGLE_QUOTED_RE = /^'((?:[^']|'')*)'\s*(?:#.*)?$/;

/**
 * One scalar: a quoted value stays a string with its quotes removed; an
 * unquoted value loses any trailing comment and may read as a boolean or
 * integer.
 */
function parseScalarValue(value: string): Scalar {
  const doubleQuoted = DOUBLE_QUOTED_RE.exec(value.trim());

  if (doubleQuoted !== null) {
    return (doubleQuoted[1] ?? "").replace(DOUBLE_QUOTED_ESCAPE_RE, "$1");
  }

  const singleQuoted = SINGLE_QUOTED_RE.exec(value.trim());

  if (singleQuoted !== null) {
    return (singleQuoted[1] ?? "").replaceAll("''", "'");
  }

  const trimmed = value.replace(COMMENT_RE, "").trim();

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

// As in YAML, a key ends at `: ` or a colon closing the line, so `Re:Zero`
// and `https://example.com` stay plain scalars.
const FIELD_RE = /^([A-Za-z0-9_-]+):(?:\s+(.*))?$/;
// A whole-line comment; it never ends a block or an object item.
const COMMENT_LINE_RE = /^\s*#/;
const LIST_ITEM_RE = /^-(?:\s+(.*))?$/;

export interface ParseResult {
  data: FrontmatterMap;
  content: string;
}

const INDENT_RE = /^ +/;
// YAML forbids tabs in indentation; counting spaces only, a tab-indented line
// would read as unindented. A tab before a comment is valid YAML, but Bun's
// reader rejects it in places, so the subset rejects it everywhere.
const TAB_INDENTED_RE = /^[ \t]*\t[ \t]*\S/;

function indentOf(line: string): number {
  return INDENT_RE.exec(line)?.[0].length ?? 0;
}

type BlockRead
  = | { ok: true; value: FrontmatterValue }
    | { ok: false; problem: string; line: string };

const NOT_AN_ITEM = "has a line that is not a `- item`";

/**
 * Parse a block of indented child lines. Returns a string[] when every item is
 * a scalar, otherwise a list of objects. A line that neither starts a `- `
 * item nor is a `key: value` field of an object item, or that is out of line
 * with its list or item, is returned so the caller can report it rather than
 * drop it.
 */
function parseBlockChildren(children: string[]): BlockRead {
  const items: FrontmatterValue[] = [];
  const listIndent = indentOf(children[0] ?? "");
  let index = 0;

  while (index < children.length) {
    const line = children[index];

    if (line === undefined) {
      index += 1;

      continue;
    }

    const itemMatch = LIST_ITEM_RE.exec(line.trimStart());

    if (itemMatch === null) {
      return { ok: false, problem: NOT_AN_ITEM, line: line.trim() };
    }

    const itemIndent = indentOf(line);

    // YAML reads a deeper `- ` as more of the previous item and rejects a
    // shallower one.
    if (itemIndent !== listIndent) {
      return { ok: false, problem: "has a `- item` indented differently from its first item", line: line.trim() };
    }

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

    // The column of `type` in `  - type: repo`.
    const fieldIndent = line.length - rest.length;

    let next = index + 1;

    while (next < children.length) {
      const sub = children[next];

      if (sub === undefined) {
        next += 1;

        break;
      }

      if (COMMENT_LINE_RE.test(sub)) {
        next += 1;

        continue;
      }

      const subIndent = indentOf(sub);

      if (subIndent <= itemIndent) {
        break;
      }

      const subField = FIELD_RE.exec(sub.trimStart());

      if (subField === null) {
        return { ok: false, problem: NOT_AN_ITEM, line: sub.trim() };
      }

      // The item's fields share the column of the field after its `- `.
      if (subIndent !== fieldIndent) {
        return { ok: false, problem: "has a field out of line with its item's first field", line: sub.trim() };
      }

      const subKey = subField[1];

      if (subKey !== undefined && subKey !== "") {
        obj[subKey] = parseScalarValue(subField[2] ?? "");
      }

      next += 1;
    }

    items.push(obj);
    index = next;
  }

  return { ok: true, value: items };
}

export type FrontmatterRead
  = | { ok: true; result: ParseResult }
    | { ok: false; reason: string };

const BYTE_ORDER_MARK = "\uFEFF";

export function readFrontmatter(raw: string): FrontmatterRead {
  const text = raw.startsWith(BYTE_ORDER_MARK) ? raw.slice(BYTE_ORDER_MARK.length) : raw;

  if (!text.startsWith("---")) {
    return { ok: false, reason: "Frontmatter is missing its opening --- fence" };
  }

  const lines = text.split("\n");

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

    block.push(line.endsWith("\r") ? line.slice(0, -1) : line);
    index += 1;
  }

  if (!closed) {
    return { ok: false, reason: "Frontmatter block is never closed with ---" };
  }

  const tabIndented = block.find((line) => TAB_INDENTED_RE.test(line));

  if (tabIndented !== undefined) {
    return { ok: false, reason: `Frontmatter has a line indented with a tab: ${tabIndented.trim()}` };
  }

  const content = lines.slice(index).join("\n");
  const data: FrontmatterMap = {};
  // The last key read with a value on its line. A deeper line after it would
  // continue that value (or nest under it), which the subset does not support.
  let valueKey: { key: string; indent: number } | null = null;
  // Top-level keys share the first key's indent; YAML rejects one left of it.
  let keyIndent: number | null = null;

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

    if (COMMENT_LINE_RE.test(line)) {
      i += 1;

      continue;
    }

    const indent = indentOf(line);

    if (valueKey !== null && indent > valueKey.indent) {
      return { ok: false, reason: `${valueKey.key} has a line indented under its value: ${line.trim()}` };
    }

    keyIndent ??= indent;

    if (indent < keyIndent) {
      return { ok: false, reason: `Frontmatter has a line indented less than its first key: ${line.trim()}` };
    }

    const field = FIELD_RE.exec(line.trimStart());

    if (field === null) {
      return { ok: false, reason: `Frontmatter has a line that is not a \`key: value\` field: ${line.trim()}` };
    }

    const key = field[1];

    if (key === undefined || key === "") {
      i += 1;

      continue;
    }

    const value = field[2] ?? "";

    // A key with a value: `title: X`. A key followed only by a comment is a
    // parent key; a quoted value always keeps its opening quote here.
    if (value.replace(COMMENT_RE, "").trim() !== "") {
      data[key] = parseScalarValue(value);
      valueKey = { key, indent };
      i += 1;

      continue;
    }

    valueKey = null;

    // A parent key (`tags:`, `links:`) consumes its indented block children.
    // Blank and whole-line comment lines never end the block; only another
    // line indented no deeper than the parent key does, so children cannot
    // leak to top level.
    // As in YAML, `- item` lines may also sit at the key's own indent.
    const children: string[] = [];
    let next = i + 1;

    while (next < block.length) {
      const child = block[next];

      if (child === undefined) {
        break;
      }

      if (child.trim() !== "" && !COMMENT_LINE_RE.test(child)) {
        const childIndent = indentOf(child);

        if (childIndent < indent || (childIndent === indent && LIST_ITEM_RE.exec(child.trimStart()) === null)) {
          break;
        }

        children.push(child);
      }

      next += 1;
    }

    const read = parseBlockChildren(children);

    if (!read.ok) {
      return { ok: false, reason: `${key} ${read.problem}: ${read.line}` };
    }

    data[key] = read.value;
    i = next;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, reason: "Frontmatter block has no fields" };
  }

  return { ok: true, result: { data, content } };
}
