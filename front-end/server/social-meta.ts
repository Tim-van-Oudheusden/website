import type { ContentFrontmatter } from "shared";
import { resolveSocialImagePath } from "shared/social-image";

interface MetaTag {
  attribute: "name" | "property";
  key: string;
  content: string;
}

/** Site name and hero line, verbatim from BRANDING.md §1–2 (the home 'start' section shows the same copy). */
export const SITE_NAME = "Build with Tim";
/** Site owner, as BRANDING.md §3 names him: author of every article. */
export const SITE_OWNER = "Tim van Oudheusden";
const HERO_LINE = "I'm Tim, a software engineer. I build small, self-hosted tools and write down how they work.";
const HOME_IMAGE_PATH = "/images/me.png";

/**
 * Add the homepage's description, canonical URL and link-preview tags to the
 * SPA shell. The shell itself carries only the <title>, so non-home routes
 * never inherit homepage tags. Origin-dependent values (canonical, og:url,
 * og:image) are why this happens per request rather than in index.html.
 */
export function renderHomeMeta(html: string, origin: string): string {
  const tags: MetaTag[] = [
    { attribute: "name", key: "description", content: HERO_LINE },
    { attribute: "property", key: "og:type", content: "website" },
    { attribute: "property", key: "og:site_name", content: SITE_NAME },
    { attribute: "property", key: "og:title", content: SITE_NAME },
    { attribute: "property", key: "og:description", content: HERO_LINE },
    { attribute: "property", key: "og:url", content: `${origin}/` },
    { attribute: "property", key: "og:image", content: `${origin}${HOME_IMAGE_PATH}` },
    { attribute: "name", key: "twitter:card", content: "summary" },
  ];

  return injectIntoHead(html, `    <link rel="canonical" href="${escapeAttribute(`${origin}/`)}" />\n${renderTags(tags)}`);
}

/**
 * Inject link-preview tags (Open Graph + Twitter) and schema.org structured
 * data for one article into the SPA shell, and retitle the page after it.
 * Crawlers such as LinkedIn's never run the app's JavaScript, so these tags
 * must be in the HTML the server sends.
 */
export function renderSocialMeta(html: string, item: ContentFrontmatter, origin: string): string {
  const articleUrl = `${origin}/articles/${encodeURIComponent(item.slug)}`;
  const tags: MetaTag[] = [
    { attribute: "name", key: "description", content: item.description },
    { attribute: "property", key: "og:type", content: "article" },
    { attribute: "property", key: "og:site_name", content: SITE_NAME },
    { attribute: "property", key: "og:title", content: item.title },
    { attribute: "property", key: "og:description", content: item.description },
    { attribute: "property", key: "og:url", content: articleUrl },
  ];

  const imagePath = resolveSocialImagePath(item.socialImage);
  const imageUrl = imagePath === null ? null : `${origin}${imagePath}`;

  if (imageUrl === null) {
    tags.push({ attribute: "name", key: "twitter:card", content: "summary" });
  } else {
    tags.push({ attribute: "property", key: "og:image", content: imageUrl });
    tags.push({ attribute: "name", key: "twitter:card", content: "summary_large_image" });
  }

  const title = `<title>${escapeAttribute(`${item.title} | ${SITE_NAME}`)}</title>`;
  // A replacer function: a string replacement would expand `$&`, `$'`, … in authored text.
  const retitled = html.replace(/<title>[\s\S]*?<\/title>/, () => title);

  return injectIntoHead(
    retitled,
    [
      `    <link rel="canonical" href="${escapeAttribute(articleUrl)}" />`,
      renderTags(tags),
      renderArticleJsonLd(item, articleUrl, imageUrl, origin),
    ].join("\n"),
  );
}

/**
 * schema.org BlogPosting, so search engines can show the headline, author and
 * publish date as a rich result.
 */
function renderArticleJsonLd(
  item: ContentFrontmatter,
  articleUrl: string,
  imageUrl: string | null,
  origin: string,
): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": item.title,
    "description": item.description,
    "datePublished": item.date,
    "url": articleUrl,
    "author": { "@type": "Person", "name": SITE_OWNER, "url": `${origin}/` },
    ...(imageUrl === null ? {} : { image: imageUrl }),
  };

  // `\u003c`-style escapes keep authored text from closing the <script> element; JSON.parse reads them back.
  const json = JSON.stringify(data).replace(/[<>&]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`);

  return `    <script type="application/ld+json">${json}</script>`;
}

// Authored frontmatter lands in an attribute: escape it so it cannot break out.
function renderTags(tags: readonly MetaTag[]): string {
  return tags
    .map(({ attribute, key, content }) => `    <meta ${attribute}="${key}" content="${escapeAttribute(content)}" />`)
    .join("\n");
}

function injectIntoHead(html: string, markup: string): string {
  return html.replace("</head>", () => `${markup}\n  </head>`);
}

function escapeAttribute(text: string): string {
  return text.replace(/[&"'<>]/g, (character) => ATTRIBUTE_ESCAPES[character] ?? character);
}

const ATTRIBUTE_ESCAPES: Record<string, string> = {
  "&": "&amp;",
  '"': "&quot;",
  "'": "&#39;",
  "<": "&lt;",
  ">": "&gt;",
};
