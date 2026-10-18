export interface MarkdownHeading {
  id: string;
  text: string;
  depth: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface MarkdownHeadingWithOffset extends MarkdownHeading {
  startOffset: number;
  startLine: number;
  startColumn: number;
}

// CommonMark allows up to three spaces before a heading; four or more make an
// indented code block. The renderer's heading node starts after that indent.
const ATX_HEADING_PATTERN = /^( {0,3})(#{1,6})[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?$/;
const SETEXT_TEXT_INDENT_PATTERN = /^ {0,3}(?=\S)/;
const SETEXT_UNDERLINE_PATTERN = /^ {0,3}(=+|-+)[ \t]*$/;
const FENCED_CODE_DELIMITER_PATTERN = /^[ \t]{0,3}([`~]{3,})/;
// A closing fence carries no info string.
const FENCED_CODE_CLOSER_PATTERN = /^[ \t]{0,3}(`{3,}|~{3,})[ \t]*$/;
// Lines that open a block other than a paragraph, so a `---` or `===` under
// them (or under their lazy continuation lines) is never a setext underline.
// A raw HTML block, like a list item or quote, runs to the next blank line.
const BLOCK_QUOTE_PATTERN = /^ {0,3}>/;
const HTML_BLOCK_PATTERN = /^ {0,3}<[A-Za-z/!?]/;
const BULLET_ITEM_PATTERN = /^ {0,3}[-*+](?:[ \t]|$)/;
const NON_EMPTY_BULLET_ITEM_PATTERN = /^ {0,3}[-*+][ \t]+\S/;
const ORDERED_ITEM_PATTERN = /^ {0,3}(\d{1,9})[.)](?:[ \t]|$)/;
const TABLE_ROW_PATTERN = /^ {0,3}\|/;
const TABLE_DELIMITER_ROW_PATTERN = /^(?=.*\|) {0,3}\|?(?:[ \t]*:?-+:?[ \t]*\|)*[ \t]*:?-+:?[ \t]*\|?[ \t]*$/;
const THEMATIC_BREAK_PATTERN = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const INDENTED_CODE_PATTERN = /^(?: {4}| {0,3}\t)/;
const ESCAPED_MARKDOWN_SYMBOL_PATTERN = /\\([\\`*_[\]{}()#+\-.!])/g;
const HTML_TAG_PATTERN = /<\/?[^>]+>/g;

/** Deepest heading level that participates in table-of-contents ids. */
export const TOC_MAX_DEPTH = 3;

/**
 * Remove HTML tags until none are left, so the result is tag-free by
 * construction rather than by the tag pattern happening to leave no tag
 * spliced together from the pieces around a removed one. One pass of
 * HTML_TAG_PATTERN already is, but CodeQL's
 * js/incomplete-multi-character-sanitization only accepts the loop.
 */
function stripHtmlTags(text: string): string {
  let previous: string;
  let current = text;

  do {
    previous = current;
    current = current.replace(HTML_TAG_PATTERN, "");
  } while (current !== previous);

  return current;
}

export function normalizeMarkdownHeadingText(rawText: string): string {
  const withoutMarkdownMarkup = rawText
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, "$1")
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]+/g, "");

  return stripHtmlTags(withoutMarkdownMarkup)
    .replace(ESCAPED_MARKDOWN_SYMBOL_PATTERN, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugifyHeadingText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/['’"]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

export function createHeadingIdResolver(): (headingText: string) => string {
  const slugCounts = new Map<string, number>();

  return (headingText: string): string => {
    const baseSlug = slugifyHeadingText(headingText);
    const normalizedBaseSlug = baseSlug.length > 0 ? baseSlug : "section";
    const currentCount = slugCounts.get(normalizedBaseSlug) ?? 0;

    slugCounts.set(normalizedBaseSlug, currentCount + 1);

    if (currentCount === 0) {
      return normalizedBaseSlug;
    }

    return `${normalizedBaseSlug}-${currentCount}`;
  };
}

function toSetextDepth(underline: string): 1 | 2 {
  if (underline.startsWith("=")) {
    return 1;
  }

  return 2;
}

/**
 * What the lines since the last blank line form: nothing open, a top-level
 * paragraph that a setext underline can turn into a heading, or a list item,
 * quote or table that absorbs lazy continuation lines and never becomes one.
 */
type OpenBlock = "none" | "paragraph" | "container";

/** Whether `line` opens a list item, quote, table row or HTML block while `openBlock` is open. */
function opensContainer(line: string, openBlock: OpenBlock): boolean {
  if (BLOCK_QUOTE_PATTERN.test(line) || HTML_BLOCK_PATTERN.test(line)) {
    return true;
  }

  // Only a non-empty bullet item, or an ordered item numbered 1, interrupts a paragraph.
  if (openBlock === "paragraph") {
    return NON_EMPTY_BULLET_ITEM_PATTERN.test(line) || ORDERED_ITEM_PATTERN.exec(line)?.[1] === "1";
  }

  return BULLET_ITEM_PATTERN.test(line) || ORDERED_ITEM_PATTERN.test(line) || TABLE_ROW_PATTERN.test(line);
}

function collectMarkdownHeadings(
  markdown: string,
  maxDepth: 1 | 2 | 3 | 4 | 5 | 6 = 6,
): MarkdownHeadingWithOffset[] {
  const lines = markdown.split(/\r?\n/);
  const lineStartOffsets: number[] = [];
  let cursor = 0;

  for (const line of lines) {
    lineStartOffsets.push(cursor);
    cursor += line.length;

    if (markdown[cursor] === "\r" && markdown[cursor + 1] === "\n") {
      cursor += 2;
    } else if (markdown[cursor] === "\n") {
      cursor += 1;
    }
  }

  const resolveHeadingId = createHeadingIdResolver();
  const headings: MarkdownHeadingWithOffset[] = [];
  let fencedCodeDelimiter: string | null = null;
  let openBlock: OpenBlock = "none";
  let paragraphStartIndex = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line === undefined) {
      continue;
    }

    if (fencedCodeDelimiter !== null) {
      const closer = FENCED_CODE_CLOSER_PATTERN.exec(line)?.[1];

      if (
        closer !== undefined
        && closer.startsWith(fencedCodeDelimiter.charAt(0))
        && closer.length >= fencedCodeDelimiter.length
      ) {
        fencedCodeDelimiter = null;
      }

      continue;
    }

    if (line.trim() === "") {
      openBlock = "none";

      continue;
    }

    const fenceMarker = FENCED_CODE_DELIMITER_PATTERN.exec(line)?.[1];

    if (fenceMarker !== undefined) {
      fencedCodeDelimiter = fenceMarker;
      openBlock = "none";

      continue;
    }

    const atxHeading = ATX_HEADING_PATTERN.exec(line);

    if (atxHeading !== null) {
      openBlock = "none";

      const indent = atxHeading[1];
      const headingHashes = atxHeading[2];
      const rawHeadingText = atxHeading[3];

      if (indent === undefined || headingHashes === undefined || rawHeadingText === undefined) {
        continue;
      }

      const depth = headingHashes.length as 1 | 2 | 3 | 4 | 5 | 6;

      if (depth > maxDepth) {
        continue;
      }

      const text = normalizeMarkdownHeadingText(rawHeadingText);

      if (text.length === 0) {
        continue;
      }

      const startOffset = (lineStartOffsets[index] ?? 0) + indent.length;

      headings.push({
        id: resolveHeadingId(text),
        text,
        depth,
        startOffset,
        startLine: index + 1,
        startColumn: indent.length + 1,
      });

      continue;
    }

    const underline = openBlock === "paragraph" ? SETEXT_UNDERLINE_PATTERN.exec(line)?.[1] : undefined;

    if (underline === undefined) {
      if (openBlock === "paragraph" && TABLE_DELIMITER_ROW_PATTERN.test(line)) {
        openBlock = "container";
      } else if (THEMATIC_BREAK_PATTERN.test(line)) {
        openBlock = "none";
      } else if (opensContainer(line, openBlock)) {
        openBlock = "container";
      } else if (openBlock === "none" && !INDENTED_CODE_PATTERN.test(line)) {
        openBlock = "paragraph";
        paragraphStartIndex = index;
      }

      continue;
    }

    openBlock = "none";

    const depth = toSetextDepth(underline);
    const headingLineIndex = paragraphStartIndex;
    const setextTextIndent = SETEXT_TEXT_INDENT_PATTERN.exec(lines[headingLineIndex] ?? "")?.[0] ?? "";

    if (depth > maxDepth) {
      continue;
    }

    const text = normalizeMarkdownHeadingText(lines.slice(headingLineIndex, index).join("\n"));

    if (text.length === 0) {
      continue;
    }

    const startOffset = (lineStartOffsets[headingLineIndex] ?? 0) + setextTextIndent.length;

    headings.push({
      id: resolveHeadingId(text),
      text,
      depth,
      startOffset,
      startLine: headingLineIndex + 1,
      startColumn: setextTextIndent.length + 1,
    });
  }

  return headings;
}

export function extractMarkdownHeadings(
  markdown: string,
  maxDepth: 1 | 2 | 3 | 4 | 5 | 6 = 6,
): MarkdownHeading[] {
  return collectMarkdownHeadings(markdown, maxDepth).map(({ id, text, depth }) => ({
    id,
    text,
    depth,
  }));
}

export function extractMarkdownHeadingsWithOffsets(
  markdown: string,
  maxDepth: 1 | 2 | 3 | 4 | 5 | 6 = 6,
): MarkdownHeadingWithOffset[] {
  return collectMarkdownHeadings(markdown, maxDepth);
}
