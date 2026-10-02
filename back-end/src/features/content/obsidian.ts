import { ASSET_PATH_PREFIX } from "shared";
import { IMAGE_EXTENSIONS } from "./image-assets";

const EMBED_PATTERN = /!\[\[([^[\]]+)\]\]/g;
const SIZE_PATTERN = /^\d+(x\d+)?$/i;

function isImagePath(path: string): boolean {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

function toContentAssetPath(rawPath: string): string | null {
  let normalizedPath = rawPath.trim();
  if (normalizedPath.length === 0) return null;

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
  if (rawOption === undefined) return "";
  const trimmed = rawOption.trim();
  if (trimmed.length === 0 || SIZE_PATTERN.test(trimmed)) {
    return "";
  }

  return trimmed.replaceAll("[", "\\[").replaceAll("]", "\\]");
}

/**
 * Convert Obsidian image embeds into standard markdown image links.
 *
 * Example:
 * `![[images/pixel.gif]]` -> `![](/content-assets/images/pixel.gif)`
 */
export function rewriteObsidianImageEmbeds(markdown: string): string {
  return markdown.replace(EMBED_PATTERN, (fullMatch, rawInner: string) => {
    const [rawPath, rawOption] = rawInner.split("|", 2);
    if (rawPath === undefined) return fullMatch;

    const contentAssetPath = toContentAssetPath(rawPath);
    if (contentAssetPath === null) {
      return fullMatch;
    }

    const altText = toAltText(rawOption);
    return `![${altText}](${contentAssetPath})`;
  });
}

