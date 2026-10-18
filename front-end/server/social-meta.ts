import type { ContentFrontmatter } from "shared";
import { HERO_LINE, SITE_NAME, SITE_OWNER } from "shared";
import { resolveSocialImagePath } from "shared/social-image";
import { SOCIAL_LINKS } from "shared/social-links";

interface MetaTag {
  attribute: "name" | "property";
  key: string;
  content: string;
}

/** A schema.org Person, as JSON-LD. */
interface JsonLdPerson {
  "@type": "Person";
  "name": string;
  "url": string;
  "sameAs": string[];
}

const HOME_IMAGE_PATH = "/images/me.png";

/** Where each content type's page lives in the client router (see App.tsx). */
export const CONTENT_PAGE_PREFIX: Record<ContentFrontmatter["type"], string> = {
  article: "/articles/",
  project: "/projects/",
};

/**
 * Mark the SPA shell sent with a 404 as not for search engines, so a dead or
 * mistyped URL never sits in an index as a thin "not found" page.
 */
export function renderNotFoundMeta(html: string): string {
  return injectIntoHead(html, '    <meta name="robots" content="noindex" />');
}

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

  return injectIntoHead(
    html,
    [
      `    <link rel="canonical" href="${escapeAttribute(`${origin}/`)}" />`,
      renderTags(tags),
      renderHomeJsonLd(origin),
    ].join("\n"),
  );
}

/**
 * Inject link-preview tags (Open Graph + Twitter) and schema.org structured
 * data for one article or project into the SPA shell, and retitle the page
 * after it. Crawlers such as LinkedIn's never run the app's JavaScript, so
 * these tags must be in the HTML the server sends.
 */
export function renderSocialMeta(html: string, item: ContentFrontmatter, origin: string): string {
  const pageUrl = `${origin}${CONTENT_PAGE_PREFIX[item.type]}${encodeURIComponent(item.slug)}`;
  const tags: MetaTag[] = [
    { attribute: "name", key: "description", content: item.description },
    { attribute: "property", key: "og:type", content: item.type === "article" ? "article" : "website" },
    { attribute: "property", key: "og:site_name", content: SITE_NAME },
    { attribute: "property", key: "og:title", content: item.title },
    { attribute: "property", key: "og:description", content: item.description },
    { attribute: "property", key: "og:url", content: pageUrl },
  ];

  const imagePath = resolveSocialImagePath(previewImageSource(item));
  const imageUrl = imagePath === null ? null : `${origin}${imagePath}`;

  // Without an authored image, fall back to the homepage portrait. It is portrait-shaped,
  // so it keeps the small card, which crops it to a square thumbnail instead of a strip.
  if (imageUrl === null) {
    tags.push({ attribute: "property", key: "og:image", content: `${origin}${HOME_IMAGE_PATH}` });
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
      `    <link rel="canonical" href="${escapeAttribute(pageUrl)}" />`,
      renderTags(tags),
      renderJsonLd(item, pageUrl, imageUrl, origin),
    ].join("\n"),
  );
}

/**
 * The authored `socialImage`, else a project's cover. LinkedIn and X ignore SVG
 * preview images, so an SVG cover counts as no image and the portrait stands in.
 */
function previewImageSource(item: ContentFrontmatter): string | null {
  if (item.socialImage !== null || item.type === "article") {
    return item.socialImage;
  }

  return /\.svg$/i.test(item.coverImage) ? null : item.coverImage;
}

/**
 * schema.org structured data naming the site and the person who runs it, so
 * search engines can tie the site to the owner's profiles.
 */
function renderHomeJsonLd(origin: string): string {
  const homeUrl = `${origin}/`;
  const person = { "@id": `${homeUrl}#person`, ...owner(origin) };

  return renderJsonLdScript({
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "WebSite",
        "@id": `${homeUrl}#website`,
        "name": SITE_NAME,
        "url": homeUrl,
        "author": { "@id": person["@id"] },
      },
    ],
  });
}

/**
 * schema.org structured data, so search engines can show the title, author and
 * date as a rich result: a BlogPosting for an article, a CreativeWork for a project.
 */
function renderJsonLd(
  item: ContentFrontmatter,
  pageUrl: string,
  imageUrl: string | null,
  origin: string,
): string {
  return renderJsonLdScript({
    "@context": "https://schema.org",
    ...(item.type === "article"
      ? { "@type": "BlogPosting", "headline": item.title }
      : { "@type": "CreativeWork", "name": item.title }),
    "description": item.description,
    "datePublished": item.date,
    "url": pageUrl,
    "author": owner(origin),
    ...(imageUrl === null ? {} : { image: imageUrl }),
  });
}

/** The site owner as a schema.org Person: author of every page. */
function owner(origin: string): JsonLdPerson {
  return {
    "@type": "Person",
    "name": SITE_OWNER,
    "url": `${origin}/`,
    // The owner's profiles, so search engines can tell this author apart from namesakes.
    "sameAs": Object.values(SOCIAL_LINKS).map((link) => link.href),
  };
}

function renderJsonLdScript(data: Record<string, unknown>): string {
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
