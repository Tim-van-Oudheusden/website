import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import type { ArticleFrontmatter } from "shared";

import { createRequestHandler } from "../../../front-end/server/handler";

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>Tim V.O.</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

const ARTICLE: ArticleFrontmatter & { body: string } = {
  type: "article",
  title: "Yoga Nidra, a way to be at peace in chaos",
  description: "How I discovered Yoga Nidra.",
  date: "2026-09-01",
  tags: [],
  draft: false,
  homeRecommended: false,
  category: "Personal Life",
  slug: "yoga-nidra",
  socialImage: "images/cover.png",
  body: "# How I discovered Yoga Nidra",
};

let root: string;
let distDir: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "front-end-server-"));
  distDir = join(root, "dist");
  mkdirSync(join(distDir, "images"), { recursive: true });
  writeFileSync(join(distDir, "index.html"), INDEX_HTML);
  writeFileSync(join(distDir, "images", "me.png"), Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  mkdirSync(join(distDir, "fonts"), { recursive: true });
  writeFileSync(join(distDir, "fonts", "face.woff2"), Uint8Array.from([0x77, 0x4f, 0x46, 0x32]));
  writeFileSync(join(distDir, "favicon.svg"), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  writeFileSync(join(distDir, "manifest.webmanifest"), '{"name":"Build with Tim"}');
  writeFileSync(join(root, "secret.txt"), "outside dist");
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

const PROJECT = { ...ARTICLE, type: "project", slug: "pi-sandbox-automation", title: "Pi Sandbox Automation" };

/** A back-end that knows one article and one project, at their real API paths. */
function backend(path: string): Promise<Response> {
  if (path === "/api/content") {
    return Promise.resolve(Response.json([ARTICLE, PROJECT]));
  }

  if (path === "/api/content/yoga-nidra") {
    return Promise.resolve(Response.json(ARTICLE));
  }

  if (path === "/api/content/pi-sandbox-automation") {
    return Promise.resolve(Response.json(PROJECT));
  }

  return Promise.resolve(Response.json({ error: "Content not found" }, { status: 404 }));
}

describe("front-end request handler", () => {
  test("serves a self-hosted woff2 font as a font, not as the SPA shell", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const response = await handle(new Request("https://buildwithtim.dev/fonts/face.woff2"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("font/woff2");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([0x77, 0x4f, 0x46, 0x32]));
  });

  test("serves an article URL as the app shell carrying that article's link-preview tags", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const response = await handle(new Request("https://buildwithtim.dev/articles/yoga-nidra"));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('<meta property="og:title" content="Yoga Nidra, a way to be at peace in chaos" />');
    expect(html).toContain('<meta property="og:image" content="https://buildwithtim.dev/content-assets/images/cover.png" />');
    expect(html).toContain('<div id="root"></div>');
  });

  test("still serves the plain app shell when the back-end cannot supply an article", async () => {
    const withBackend = createRequestHandler({ distDir, fetchBackend: backend });
    const backendDown = createRequestHandler({
      distDir,
      fetchBackend: () => Promise.reject(new Error("connect ECONNREFUSED 127.0.0.1:3001")),
    });

    for (const [handle, path] of [
      [withBackend, "/articles/no-such-article"],
      [withBackend, "/articles/pi-sandbox-automation"],
      [backendDown, "/articles/yoga-nidra"],
    ] as const) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));

      expect(response.status).toBe(200);
      expect(await response.text()).toBe(INDEX_HTML);
    }
  });

  test("serves built files as-is and every other route as the app shell", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const image = await handle(new Request("https://buildwithtim.dev/images/me.png"));

    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(new Uint8Array(readFileSync(join(distDir, "images", "me.png"))));

    for (const path of ["/projects", "/projects/pi-sandbox-automation", "/images"]) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));

      expect(response.status).toBe(200);
      expect(await response.text()).toBe(INDEX_HTML);
    }
  });

  test("never serves a file from outside the build directory", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    for (const path of ["/../secret.txt", "/%2e%2e/secret.txt", "/..%2fsecret.txt", "/images/..%2f..%2fsecret.txt"]) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));

      expect(await response.text()).toBe(INDEX_HTML);
    }
  });

  test("answers /favicon.ico with a 404 instead of the app shell, and still serves /favicon.svg", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const ico = await handle(new Request("https://buildwithtim.dev/favicon.ico"));

    expect(ico.status).toBe(404);
    expect(await ico.text()).not.toContain('<div id="root"></div>');

    const svg = await handle(new Request("https://buildwithtim.dev/favicon.svg"));

    expect(svg.status).toBe(200);
    expect(svg.headers.get("content-type")).toContain("image/svg+xml");
    expect(await svg.text()).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
  });

  test("serves the web app manifest with its manifest media type", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const manifest = await handle(new Request("https://buildwithtim.dev/manifest.webmanifest"));

    expect(manifest.status).toBe(200);
    expect(manifest.headers.get("content-type")).toContain("application/manifest+json");
    expect(await manifest.text()).toBe('{"name":"Build with Tim"}');
  });

  test("builds preview URLs with the visitor's scheme when TLS ends at the tunnel", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const response = await handle(new Request("http://buildwithtim.dev/articles/yoga-nidra", {
      headers: { "x-forwarded-proto": "https" },
    }));

    expect(await response.text()).toContain('<meta property="og:url" content="https://buildwithtim.dev/articles/yoga-nidra" />');
  });

  test("looks the article up under the visitor's IP so the back-end rate-limits per client", async () => {
    const visitorIps: (string | null)[] = [];
    const handle = createRequestHandler({
      distDir,
      fetchBackend: (path, headers) => {
        visitorIps.push(new Headers(headers).get("cf-connecting-ip"));

        return backend(path);
      },
    });

    await handle(new Request("https://buildwithtim.dev/articles/yoga-nidra", { headers: { "cf-connecting-ip": "203.0.113.7" } }));
    await handle(new Request("https://buildwithtim.dev/articles/yoga-nidra"));

    expect(visitorIps).toEqual(["203.0.113.7", null]);
  });

  test("serves a robots.txt that allows crawling and points at the sitemap on the visitor's origin", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const response = await handle(new Request("http://buildwithtim.dev/robots.txt", {
      headers: { "x-forwarded-proto": "https" },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe("User-agent: *\nAllow: /\n\nSitemap: https://buildwithtim.dev/sitemap.xml\n");
  });

  test("serves an llms.txt naming the site and linking its sections, articles and projects on the visitor's origin", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const response = await handle(new Request("http://buildwithtim.dev/llms.txt", {
      headers: { "x-forwarded-proto": "https" },
    }));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(text.startsWith("# Build with Tim\n")).toBe(true);
    expect(text).toContain("- [Articles](https://buildwithtim.dev/articles)");
    expect(text).toContain("- [Projects](https://buildwithtim.dev/projects)");
    expect(text).toContain("- [Yoga Nidra, a way to be at peace in chaos](https://buildwithtim.dev/articles/yoga-nidra): How I discovered Yoga Nidra.");
    expect(text).toContain("- [Pi Sandbox Automation](https://buildwithtim.dev/projects/pi-sandbox-automation)");
  });

  test("still serves llms.txt with the fixed sections when the back-end is down", async () => {
    const handle = createRequestHandler({
      distDir,
      fetchBackend: () => Promise.reject(new Error("connect ECONNREFUSED 127.0.0.1:3001")),
    });

    const response = await handle(new Request("https://buildwithtim.dev/llms.txt"));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("- [Articles](https://buildwithtim.dev/articles)");
    expect(text).not.toContain("yoga-nidra");
  });

  test("serves a sitemap of the fixed pages and every published article and project", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const response = await handle(new Request("https://buildwithtim.dev/sitemap.xml"));
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/xml");

    expect([...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1])).toEqual([
      "https://buildwithtim.dev/",
      "https://buildwithtim.dev/articles",
      "https://buildwithtim.dev/projects",
      "https://buildwithtim.dev/now",
      "https://buildwithtim.dev/uses",
      "https://buildwithtim.dev/articles/yoga-nidra",
      "https://buildwithtim.dev/projects/pi-sandbox-automation",
    ]);
  });

  test("still lists the fixed pages in the sitemap when the back-end is down", async () => {
    const handle = createRequestHandler({
      distDir,
      fetchBackend: () => Promise.reject(new Error("connect ECONNREFUSED 127.0.0.1:3001")),
    });

    const response = await handle(new Request("https://buildwithtim.dev/sitemap.xml"));
    const xml = await response.text();

    expect(response.status).toBe(200);

    expect([...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((match) => match[1])).toEqual([
      "https://buildwithtim.dev/",
      "https://buildwithtim.dev/articles",
      "https://buildwithtim.dev/projects",
      "https://buildwithtim.dev/now",
      "https://buildwithtim.dev/uses",
    ]);
  });

  test("serves an Atom feed of published articles, not projects, on the visitor's origin", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const response = await handle(new Request("http://buildwithtim.dev/feed.xml", {
      headers: { "x-forwarded-proto": "https" },
    }));
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/atom+xml");
    expect(xml).toContain('<link rel="self" href="https://buildwithtim.dev/feed.xml"/>');

    expect([...xml.matchAll(/<entry>[\s\S]*?<id>([^<]*)<\/id>/g)].map((match) => match[1])).toEqual([
      "https://buildwithtim.dev/articles/yoga-nidra",
    ]);
  });

  test("answers the feed with a 503 rather than an empty feed when the back-end is down", async () => {
    const handle = createRequestHandler({
      distDir,
      fetchBackend: () => Promise.reject(new Error("connect ECONNREFUSED 127.0.0.1:3001")),
    });

    const response = await handle(new Request("https://buildwithtim.dev/feed.xml"));

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("<feed");
  });

  test("serves the homepage with the rebrand title, description, canonical URL and preview tags on the visitor's origin", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const response = await handle(new Request("http://buildwithtim.dev/", { headers: { "x-forwarded-proto": "https" } }));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain('<link rel="canonical" href="https://buildwithtim.dev/" />');
    expect(html).toContain('<meta name="description" content="I&#39;m Tim, a software engineer. I build small, self-hosted tools and write down how they work." />');
    expect(html).toContain('<meta property="og:title" content="Build with Tim" />');
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<meta property="og:url" content="https://buildwithtim.dev/" />');
    expect(html).toContain('<meta property="og:image" content="https://buildwithtim.dev/images/me.png" />');
    expect(html).toContain('<meta name="twitter:card" content="summary" />');
    expect(html).toContain('<div id="root"></div>');
  });

  test("gives the homepage canonical the origin the visitor used, not a hard-coded domain", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    const html = await (await handle(new Request("http://localhost:3000/"))).text();

    expect(html).toContain('<link rel="canonical" href="http://localhost:3000/" />');
  });

  test("keeps the real app shell free of duplicate or conflicting title and preview tags on home and article pages", async () => {
    const realDist = join(root, "real-dist");

    mkdirSync(realDist, { recursive: true });
    writeFileSync(join(realDist, "index.html"), readFileSync(join(import.meta.dir, "../../../front-end/index.html")));
    const handle = createRequestHandler({ distDir: realDist, fetchBackend: backend });

    for (const path of ["/", "/articles/yoga-nidra"]) {
      const html = await (await handle(new Request(`https://buildwithtim.dev${path}`))).text();

      expect(html.match(/<title>/g)).toHaveLength(1);

      for (const key of ["description", "og:title", "og:description", "og:url", "og:type", "twitter:card"]) {
        expect(html.match(new RegExp(`<meta (?:name|property)="${key}"`, "g"))).toHaveLength(1);
      }
    }

    const article = await (await handle(new Request("https://buildwithtim.dev/articles/yoga-nidra"))).text();

    expect(article).toContain("<title>Yoga Nidra, a way to be at peace in chaos | Build with Tim</title>");
    expect(article).not.toContain('rel="canonical" href="https://buildwithtim.dev/"');
  });

  test("sends the back-end's framing and MIME-sniffing protections on every response", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    for (const path of ["/", "/articles/yoga-nidra", "/images/me.png", "/robots.txt", "/llms.txt", "/sitemap.xml", "/feed.xml"]) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));

      expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });
});
