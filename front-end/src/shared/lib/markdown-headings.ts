export interface MarkdownHeading {
  id: string;
  text: string;
  depth: 1 | 2 | 3 | 4 | 5 | 6;
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

export function extractMarkdownHeadings(
  markdown: string,
  maxDepth: 1 | 2 | 3 | 4 | 5 | 6 = 6,
): MarkdownHeading[] {
  const lines = markdown.split(/\r?\n/);
  const resolveHeadingId = createHeadingIdResolver();
  const headings: MarkdownHeading[] = [];
  let fencedCodeDelimiter: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fencedCodeDelimiterMatch = line.match(FENCED_CODE_DELIMITER_PATTERN);
    if (fencedCodeDelimiter !== null) {
      if (
        fencedCodeDelimiterMatch !== null
        && fencedCodeDelimiterMatch[1][0] === fencedCodeDelimiter[0]
        && fencedCodeDelimiterMatch[1].length >= fencedCodeDelimiter.length
      ) {
        fencedCodeDelimiter = null;
      }
      continue;
    }

    if (fencedCodeDelimiterMatch !== null) {
      fencedCodeDelimiter = fencedCodeDelimiterMatch[1];
      continue;
    }

    const atxHeading = line.match(ATX_HEADING_PATTERN);

    if (atxHeading !== null) {
      const depth = atxHeading[1].length as 1 | 2 | 3 | 4 | 5 | 6;
      if (depth > maxDepth) {
        continue;
      }

      const text = normalizeMarkdownHeadingText(atxHeading[2]);
      if (text.length === 0) {
        continue;
      }

      headings.push({
        id: resolveHeadingId(text),
        text,
        depth,
      });
      continue;
    }

    const nextLine = lines[index + 1];
    if (nextLine == null || line.trim().length === 0) {
      continue;
    }

    const setextUnderline = nextLine.match(SETEXT_UNDERLINE_PATTERN);
    if (setextUnderline === null) {
      continue;
    }

    const depth = toSetextDepth(setextUnderline[1]);
    index += 1;
    if (depth > maxDepth) {
      continue;
    }

    const text = normalizeMarkdownHeadingText(line);
    if (text.length === 0) {
      continue;
    }

    headings.push({
      id: resolveHeadingId(text),
      text,
      depth,
    });
  }

  return headings;
}
