import { describe, expect, test } from "bun:test";

import type { ArticleFrontmatter } from "shared";

import { renderHomeMeta, renderSocialMeta } from "../../../front-end/server/social-meta";

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Tim V.O.</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

const ORIGIN = "https://buildwithtim.dev";

function article(overrides: Partial<ArticleFrontmatter> = {}): ArticleFrontmatter {
  return {
    type: "article",
    socialImage: null,
    title: "Apt-get out of my life, hello flatpak",
    description: "Why I moved my desktop apps to Flatpak.",
    date: "2026-09-01",
    tags: [],
    draft: false,
    homeRecommended: false,
    category: "Linux",
    slug: "apt-get-out-of-my-life-hello-flatpak",
    ...overrides,
  };
}

/** Collects `<meta property|name="…" content="…">` from the document <head>. */
function headMeta(html: string): Map<string, string> {
  const head = /<head>([\s\S]*)<\/head>/.exec(html)?.[1] ?? "";
  const meta = new Map<string, string>();

  for (const match of head.matchAll(/<meta (?:property|name)="([^"]+)" content="([^"]*)"\s*\/?>/g)) {
    meta.set(match[1] ?? "", match[2] ?? "");
  }

  return meta;
}

describe("renderSocialMeta", () => {
  test("adds the Open Graph and Twitter tags a link preview needs for an article", () => {
    const html = renderSocialMeta(INDEX_HTML, article({ socialImage: "images/cover.png" }), ORIGIN);
    const meta = headMeta(html);

    expect(meta.get("og:type")).toBe("article");
    expect(meta.get("og:title")).toBe("Apt-get out of my life, hello flatpak");
    expect(meta.get("og:description")).toBe("Why I moved my desktop apps to Flatpak.");
    expect(meta.get("description")).toBe("Why I moved my desktop apps to Flatpak.");
    expect(meta.get("og:url")).toBe("https://buildwithtim.dev/articles/apt-get-out-of-my-life-hello-flatpak");
    expect(meta.get("og:image")).toBe("https://buildwithtim.dev/content-assets/images/cover.png");
    expect(meta.get("twitter:card")).toBe("summary_large_image");
    expect(html).toContain('<div id="root"></div>');
  });

  test("escapes authored text so it cannot break out of the attribute", () => {
    const html = renderSocialMeta(
      INDEX_HTML,
      article({ title: `Tabs & "spaces" <script>alert(1)</script>`, description: "it's <b>bold</b>" }),
      ORIGIN,
    );
    const meta = headMeta(html);

    expect(meta.get("og:title")).toBe("Tabs &amp; &quot;spaces&quot; &lt;script&gt;alert(1)&lt;/script&gt;");
    expect(meta.get("og:description")).toBe("it&#39;s &lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
  });

  test("keeps dollar signs literal instead of reading them as replacement patterns", () => {
    const html = renderSocialMeta(INDEX_HTML, article({ title: "Pay $$ now, keep $'s", description: "Costs $` and $&" }), ORIGIN);
    const meta = headMeta(html);

    expect(meta.get("og:title")).toBe("Pay $$ now, keep $&#39;s");
    expect(meta.get("og:description")).toBe("Costs $` and $&amp;");
    expect(html.match(/<\/head>/g)).toHaveLength(1);
  });

  test("omits og:image and uses a small card when the article has no socialImage", () => {
    const meta = headMeta(renderSocialMeta(INDEX_HTML, article(), ORIGIN));

    expect(meta.has("og:image")).toBe(false);
    expect(meta.get("twitter:card")).toBe("summary");
    expect(meta.get("og:title")).toBe("Apt-get out of my life, hello flatpak");
  });

  test("treats a root-absolute socialImage as a site path, not a content image", () => {
    const meta = headMeta(renderSocialMeta(INDEX_HTML, article({ socialImage: "/images/me.png" }), ORIGIN));

    expect(meta.get("og:image")).toBe("https://buildwithtim.dev/images/me.png");
  });
});

describe("renderSocialMeta page identity", () => {
  test("retitles the page after the article and percent-encodes the slug in og:url", () => {
    const html = renderSocialMeta(INDEX_HTML, article({ title: "A & B", slug: "a b" }), ORIGIN);

    expect(html).toContain("<title>A &amp; B | Build with Tim</title>");
    expect(html).not.toContain("<title>Tim V.O.</title>");
    expect(headMeta(html).get("og:url")).toBe("https://buildwithtim.dev/articles/a%20b");
  });
});

describe("renderHomeMeta", () => {
  test("adds the description, canonical link and preview tags for the homepage", () => {
    const html = renderHomeMeta(INDEX_HTML, ORIGIN);
    const meta = headMeta(html);

    expect(html).toContain('<link rel="canonical" href="https://buildwithtim.dev/" />');
    expect(meta.get("og:type")).toBe("website");
    expect(meta.get("og:title")).toBe("Build with Tim");
    expect(meta.get("og:url")).toBe("https://buildwithtim.dev/");
    expect(meta.get("description")).toContain("self-hosted tools");
  });
});
