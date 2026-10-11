/** Typical adult silent-reading speed for non-fiction prose. */
const WORDS_PER_MINUTE = 230;

const LINK_TARGET_PATTERN = /\]\([^)]*\)/g;
const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/** Whole minutes (at least one) a reader needs for a markdown body; link targets are not read, so they don't count. */
export function estimateReadingMinutes(markdown: string): number {
  const wordCount = markdown.replace(LINK_TARGET_PATTERN, "]").match(WORD_PATTERN)?.length ?? 0;

  return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE));
}
