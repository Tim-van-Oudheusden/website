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

const ATX_HEADING_PATTERN = /^(#{1,6})[ \t]+(.+?)(?:[ \t]+#+[ \t]*)?$/;
const SETEXT_UNDERLINE_PATTERN = /^(=+|-+)[ \t]*$/;
const FENCED_CODE_DELIMITER_PATTERN = /^[ \t]{0,3}([`~]{3,})/;
const ESCAPED_MARKDOWN_SYMBOL_PATTERN = /\\([\\`*_[\]{}()#+\-.!])/g;

export function normalizeMarkdownHeadingText(rawText: string): string {
  return rawText
    .replace(/!\[([^\]]*)\]\(([^)]*)\)/g, "$1")
    .replace(/!\[([^\]]*)\]\[[^\]]*\]/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]*)\)/g, "$1")
    .replace(/\[([^\]]+)\]\[[^\]]*\]/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]+/g, "")
    .replace(/<\/?[^>]+>/g, "")
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

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined) {
      continue;
    }

    const fencedCodeDelimiterMatch = FENCED_CODE_DELIMITER_PATTERN.exec(line);
    const fenceMarker = fencedCodeDelimiterMatch?.[1];
    if (fencedCodeDelimiter !== null) {
      if (
        fenceMarker !== undefined
        && fenceMarker.startsWith(fencedCodeDelimiter.charAt(0))
        && fenceMarker.length >= fencedCodeDelimiter.length
      ) {
        fencedCodeDelimiter = null;
      }
      continue;
    }

    if (fenceMarker !== undefined) {
      fencedCodeDelimiter = fenceMarker;
      continue;
    }

    const atxHeading = ATX_HEADING_PATTERN.exec(line);

    if (atxHeading !== null) {
      const headingHashes = atxHeading[1];
      const rawHeadingText = atxHeading[2];
      if (headingHashes === undefined || rawHeadingText === undefined) {
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

      const startOffset = lineStartOffsets[index] ?? 0;

      headings.push({
        id: resolveHeadingId(text),
        text,
        depth,
        startOffset,
        startLine: index + 1,
        startColumn: 1,
      });
      continue;
    }

    const nextLine = lines[index + 1];
    if (nextLine === undefined || line.trim().length === 0) {
      continue;
    }

    const setextUnderline = SETEXT_UNDERLINE_PATTERN.exec(nextLine);
    if (setextUnderline === null) {
      continue;
    }

    const underline = setextUnderline[1];
    if (underline === undefined) {
      continue;
    }

    const depth = toSetextDepth(underline);
    const headingLineIndex = index;
    index += 1;
    if (depth > maxDepth) {
      continue;
    }

    const text = normalizeMarkdownHeadingText(line);
    if (text.length === 0) {
      continue;
    }

    const startOffset = lineStartOffsets[headingLineIndex] ?? 0;

    headings.push({
      id: resolveHeadingId(text),
      text,
      depth,
      startOffset,
      startLine: headingLineIndex + 1,
      startColumn: 1,
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
