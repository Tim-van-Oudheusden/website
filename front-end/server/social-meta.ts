import type { ContentFrontmatter } from "shared";
import { ASSET_PATH_PREFIX } from "shared";

interface MetaTag {
  attribute: "name" | "property";
  key: string;
  content: string;
}

/**
 * Inject link-preview tags (Open Graph + Twitter) for one article into the
 * SPA shell. Crawlers such as LinkedIn's never run the app's JavaScript, so
 * these tags must be in the HTML the server sends.
 */
export function renderSocialMeta(html: string, item: ContentFrontmatter, origin: string): string {
  const tags: MetaTag[] = [
    { attribute: "name", key: "description", content: item.description },
    { attribute: "property", key: "og:type", content: "article" },
    { attribute: "property", key: "og:title", content: item.title },
    { attribute: "property", key: "og:description", content: item.description },
    { attribute: "property", key: "og:url", content: `${origin}/articles/${item.slug ?? ""}` },
  ];

  if (item.socialImage === undefined) {
    tags.push({ attribute: "name", key: "twitter:card", content: "summary" });
  } else {
    // "/images/me.png" is a site path (public/); "images/cover.png" is relative
    // to the content directory, which the back-end serves under ASSET_PATH_PREFIX.
    const imagePath = item.socialImage.startsWith("/")
      ? item.socialImage
      : `${ASSET_PATH_PREFIX}${item.socialImage.replace(/^images\//, "")}`;

    tags.push({ attribute: "property", key: "og:image", content: `${origin}${imagePath}` });
    tags.push({ attribute: "name", key: "twitter:card", content: "summary_large_image" });
  }

  // Authored frontmatter lands in an attribute: escape it so it cannot break out.
  const markup = tags
    .map(({ attribute, key, content }) => {
      const escaped = content.replace(/[&"'<>]/g, (character) => ATTRIBUTE_ESCAPES[character] ?? character);

      return `    <meta ${attribute}="${key}" content="${escaped}" />`;
    })
    .join("\n");

  // A replacer function: a string replacement would expand `$&`, `$'`, … in authored text.
  return html.replace("</head>", () => `${markup}\n  </head>`);
}

const ATTRIBUTE_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  '"': "&quot;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};
