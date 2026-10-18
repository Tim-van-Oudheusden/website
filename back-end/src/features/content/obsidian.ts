import { ASSET_PATH_PREFIX } from "shared";

import { IMAGE_EXTENSIONS } from "./image-assets";

// A code span, which is kept as is, or an embed (group 2). A code span runs from
// a run of backticks to the next run of the same length, within one paragraph.
const CODE_SPAN_OR_EMBED_PATTERN = /(?<![\\`])(`+)(?!`)(?:(?!\n[ \t>]*\n)[\s\S])*?(?<!`)\1(?!`)|!\[\[([^[\]]+)\]\]/g;
// A code fence line, also when it is indented in a list item or quoted in a callout.
const FENCE_PATTERN = /^[\t >]*(`{3,}|~{3,})(.*)$/;
const SIZE_PATTERN = /^\d+(x\d+)?$/i;

function isImagePath(path: string): boolean {
  const lower = path.toLowerCase();

  return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function toContentAssetPath(rawPath: string): string | null {
  let normalizedPath = rawPath.trim();

  if (normalizedPath.length === 0) {
    return null;
  }

  const hashIndex = normalizedPath.indexOf("#");

  if (hashIndex >= 0) {
    normalizedPath = normalizedPath.slice(0, hashIndex);
  }

  if (normalizedPath.startsWith(ASSET_PATH_PREFIX)) {
    return normalizedPath;
  }

  if (normalizedPath.startsWith("content-assets/images/")) {
    return `/${normalizedPath}`;
  }

  if (normalizedPath.startsWith("/content/images/")) {
    normalizedPath = normalizedPath.slice("/content/images/".length);
  } else if (normalizedPath.startsWith("content/images/")) {
    normalizedPath = normalizedPath.slice("content/images/".length);
  } else if (normalizedPath.startsWith("/images/")) {
    normalizedPath = normalizedPath.slice("/images/".length);
  } else if (normalizedPath.startsWith("images/")) {
    normalizedPath = normalizedPath.slice("images/".length);
  }

  normalizedPath = normalizedPath.replace(/^\/+/, "");

  if (!isImagePath(normalizedPath)) {
    return null;
  }

  const encodedPath = normalizedPath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `${ASSET_PATH_PREFIX}${encodedPath}`;
}

function toAltText(rawOption: string | undefined): string {
  if (rawOption === undefined) {
    return "";
  }

  const trimmed = rawOption.trim();

  if (trimmed.length === 0 || SIZE_PATTERN.test(trimmed)) {
    return "";
  }

  return trimmed.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

function rewriteEmbed(rawInner: string): string | null {
  const [rawPath, rawOption] = rawInner.split("|", 2);

  if (rawPath === undefined) {
    return null;
  }

  const contentAssetPath = toContentAssetPath(rawPath);

  if (contentAssetPath === null) {
    return null;
  }

  return `![${toAltText(rawOption)}](${contentAssetPath})`;
}

function rewriteProse(prose: string): string {
  return prose.replace(CODE_SPAN_OR_EMBED_PATTERN, (fullMatch, _ticks, rawInner: string | undefined) => {
    if (rawInner === undefined) {
      return fullMatch;
    }

    return rewriteEmbed(rawInner) ?? fullMatch;
  });
}

/** The fence run that `line` opens, or null; a backtick fence's info string has no backtick. */
function openingFence(line: string): string | null {
  const match = FENCE_PATTERN.exec(line);

  if (match === null) {
    return null;
  }

  const [, run = "", info = ""] = match;

  return run.startsWith("`") && info.includes("`") ? null : run;
}

/** Whether `line` closes a fence opened by `run`: the same character, at least as long, then only whitespace. */
function closesFence(line: string, run: string): boolean {
  const match = FENCE_PATTERN.exec(line);

  if (match === null) {
    return false;
  }

  const [, closing = "", rest = ""] = match;

  return closing.startsWith(run.slice(0, 1)) && closing.length >= run.length && rest.trim() === "";
}

interface Segment {
  code: boolean;
  lines: string[];
}

/**
 * Split a body into runs of prose lines and fenced code blocks (fence lines
 * included). A fence left open runs to the end of the body, as in CommonMark.
 */
function splitFencedCode(markdown: string): Segment[] {
  const segments: Segment[] = [];
  let fence: string | null = null;

  for (const line of markdown.split("\n")) {
    let code = fence !== null;

    if (fence === null) {
      fence = openingFence(line);
      code = fence !== null;
    } else if (closesFence(line, fence)) {
      fence = null;
    }

    const last = segments.at(-1);

    // Back-to-back fenced blocks share a segment: both stay as written.
    if (last?.code === code) {
      last.lines.push(line);
    } else {
      segments.push({ code, lines: [line] });
    }
  }

  return segments;
}

/**
 * Convert Obsidian image embeds into standard markdown image links. Embeds in
 * code spans and fenced code blocks are literal text and stay as written.
 *
 * Example:
 * `![[images/pixel.gif]]` -> `![](/content-assets/images/pixel.gif)`
 */
export function rewriteObsidianImageEmbeds(markdown: string): string {
  return splitFencedCode(markdown)
    .map(({ code, lines }) => (code ? lines.join("\n") : rewriteProse(lines.join("\n"))))
    .join("\n");
}
