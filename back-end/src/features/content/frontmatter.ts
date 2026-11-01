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
 *   key: value                     scalar (string, boolean, number, null)
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
 * double quotes YAML's escapes (`\"`, `\\`, `\n`, `\u00e9`, ...) are decoded;
 * inside single quotes `''` is. An unquoted value loses a trailing
 * ` # comment` and is typed as YAML 1.2's core schema types it: `true`, `True`
 * and `TRUE` are booleans, `null` and `~` are null, and `1.5`, `+5`, `0x1F` or
 * `.inf` are numbers. Flow lists (`[a, b]`), multi-line scalars, and other
 * YAML forms are not part of the subset.
 *
 * `readFrontmatter` returns the parsed data object plus the body after the
 * closing `---`, or the reason no valid leading frontmatter block exists. Every
 * line the subset does not recognise is such a reason, so it is reported
 * instead of dropped: a line under a block key that is not a `- ` item (or a
 * field of an object item), a top-level line that is not `key: value`, and a
 * line indented under a key that has a value on its own line.
 *
 * A leading UTF-8 byte-order mark is ignored and frontmatter lines may end in
 * CRLF; the body keeps its original line endings.
 */

type Scalar = string | number | boolean | null;

interface FrontmatterMap {
  [key: string]: Scalar | FrontmatterValue[] | FrontmatterMap;
}

type FrontmatterValue = Scalar | FrontmatterValue[] | FrontmatterMap;

// YAML 1.2 core schema: unquoted values that are not strings.
const BOOLEAN_TRUE_RE = /^(?:true|True|TRUE)$/;
const BOOLEAN_FALSE_RE = /^(?:false|False|FALSE)$/;
const NULL_RE = /^(?:null|Null|NULL|~)$/;
// Decimal, `0o` octal and `0x` hex numbers, all of which `Number` reads.
const NUMERIC_RE = /^(?:[-+]?(?:\.\d+|\d+(?:\.\d*)?)(?:[eE][-+]?\d+)?|0o[0-7]+|0x[\dA-Fa-f]+)$/;
const INFINITY_RE = /^([-+]?)\.(?:inf|Inf|INF)$/;
const NAN_RE = /^\.(?:nan|NaN|NAN)$/;
// YAML starts a comment at a `#` that opens the value or follows whitespace.
const COMMENT_RE = /(?:^|\s)#.*$/;
// A double- or single-quoted scalar, optionally followed by a comment. Inside
// double quotes a backslash starts an escape; inside single quotes `''` is one.
const DOUBLE_QUOTED_RE = /^"((?:[^"\\]|\\.)*)"\s*(?:#.*)?$/;
const SINGLE_QUOTED_RE = /^'((?:[^']|'')*)'\s*(?:#.*)?$/;
const DOUBLE_QUOTED_ESCAPE_RE = /\\(?:x([\dA-Fa-f]{2})|u([\dA-Fa-f]{4})|U([\dA-Fa-f]{8})|(.))/g;
// YAML's one-character escapes (YAML 1.2 §5.7). A backslash before a literal
// tab is a tab too.
const DOUBLE_QUOTED_ESCAPES: Record<string, string> = {
  "0": "\0",
  "a": "\x07",
  "b": "\b",
  "t": "\t",
  "\t": "\t",
  "n": "\n",
  "v": "\v",
  "f": "\f",
  "r": "\r",
  "e": "\x1B",
  " ": " ",
  "\"": "\"",
  "/": "/",
  "\\": "\\",
  "N": "\u0085",
  "_": "\u00A0",
  "L": "\u2028",
  "P": "\u2029",
};
const MAX_CODE_POINT = 0x10FFFF;

/**
 * Decode the escapes in a double-quoted scalar's text. One YAML does not
 * define is kept as written.
 */
function decodeDoubleQuoted(text: string): string {
  return text.replace(DOUBLE_QUOTED_ESCAPE_RE, (
    escape: string,
    x: string | undefined,
    u: string | undefined,
    bigU: string | undefined,
    char: string | undefined,
  ) => {
    const hex = x ?? u ?? bigU;

    if (hex !== undefined) {
      const codePoint = Number.parseInt(hex, 16);

      return codePoint <= MAX_CODE_POINT ? String.fromCodePoint(codePoint) : escape;
    }

    return DOUBLE_QUOTED_ESCAPES[char ?? ""] ?? escape;
  });
}

/**
 * One scalar: a quoted value stays a string with its quotes removed; an
 * unquoted value loses any trailing comment and may read as a boolean, null or
 * number.
 */
function parseScalarValue(value: string): Scalar {
  const doubleQuoted = DOUBLE_QUOTED_RE.exec(value.trim());

  if (doubleQuoted !== null) {
    return decodeDoubleQuoted(doubleQuoted[1] ?? "");
  }

  const singleQuoted = SINGLE_QUOTED_RE.exec(value.trim());

  if (singleQuoted !== null) {
    return (singleQuoted[1] ?? "").replaceAll("''", "'");
  }

  const trimmed = value.replace(COMMENT_RE, "").trim();

  if (BOOLEAN_TRUE_RE.test(trimmed)) {
    return true;
  }

  if (BOOLEAN_FALSE_RE.test(trimmed)) {
    return false;
  }

  if (NULL_RE.test(trimmed)) {
    return null;
  }

  if (NUMERIC_RE.test(trimmed)) {
    return Number(trimmed);
  }

  const infinity = INFINITY_RE.exec(trimmed);

  if (infinity !== null) {
    return infinity[1] === "-" ? -Infinity : Infinity;
  }

  if (NAN_RE.test(trimmed)) {
    return Number.NaN;
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

function indentOf(line: string): number {
  return INDENT_RE.exec(line)?.[0].length ?? 0;
}

type BlockRead
  = | { ok: true; value: FrontmatterValue }
    | { ok: false; line: string };

/**
 * Parse a block of indented child lines. Returns a string[] when every item is
 * a scalar, otherwise a list of objects. A line that neither starts a `- `
 * item nor is a `key: value` field of an object item is returned so the caller
 * can report it rather than drop it.
 */
function parseBlockChildren(children: string[]): BlockRead {
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
      return { ok: false, line: line.trim() };
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
        return { ok: false, line: sub.trim() };
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

  const content = lines.slice(index).join("\n");
  const data: FrontmatterMap = {};
  // The last key read with a value on its line. A deeper line after it would
  // continue that value (or nest under it), which the subset does not support.
  let valueKey: { key: string; indent: number } | null = null;

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
      return { ok: false, reason: `${key} has a line that is not a \`- item\`: ${read.line}` };
    }

    data[key] = read.value;
    i = next;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, reason: "Frontmatter block has no fields" };
  }

  return { ok: true, result: { data, content } };
}
