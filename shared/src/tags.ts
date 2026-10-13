/**
 * Tag URL slugs, shared so the front-end's `/tags/:tag` links and the
 * back-end's content checker can never disagree on which tags share a page.
 */

/**
 * The URL form of a tag: NFC-normalised, lowercase, every run of characters
 * other than letters, digits, "+" and "#" one hyphen. Keeping "+" and "#"
 * gives C, C++ and C# separate pages. Authored tags ("Content API") and route
 * params ("content-api", "Content-API") both pass through it, so matching is
 * case-insensitive by construction. Empty for a tag with none of those
 * characters, such as an emoji.
 */
export function tagSlug(tag: string): string {
  return tag.normalize("NFC").toLowerCase().replace(/[^\p{L}\p{N}+#]+/gu, "-").replace(/^-|-$/g, "");
}
