import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { createRoutesFromChildren } from "react-router";

import type { ArticleFrontmatter } from "shared";

import { createRequestHandler } from "../../../front-end/server/handler";
import { AppRoutes } from "../../../front-end/src/App";

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

/** For tests that do not check what the handler reports about the back-end. */
// eslint-disable-next-line @typescript-eslint/no-empty-function
function ignoreUnavailable(): void {}

const NOINDEX = '<meta name="robots" content="noindex" />';

/** A real URL for each parameterised client route; every other route path is its own URL. */
const ROUTE_SAMPLES: Readonly<Record<string, string>> = {
  "/articles/:slug": "/articles/yoga-nidra",
  "/projects/:slug": "/projects/pi-sandbox-automation",
  "/tags/:tag": "/tags/docker",
};

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
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    const response = await handle(new Request("https://buildwithtim.dev/fonts/face.woff2"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("font/woff2");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(Uint8Array.from([0x77, 0x4f, 0x46, 0x32]));
  });

  test("serves an article URL as the app shell carrying that article's link-preview tags", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    const response = await handle(new Request("https://buildwithtim.dev/articles/yoga-nidra"));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(html).toContain('<meta property="og:title" content="Yoga Nidra, a way to be at peace in chaos" />');
    expect(html).toContain('<meta property="og:image" content="https://buildwithtim.dev/content-assets/images/cover.png" />');
    expect(html).toContain('<div id="root"></div>');
  });

  test("answers an unknown slug, or one from the other section, with the app shell as a noindex 404", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    for (const path of [
      "/articles/no-such-article",
      "/articles/pi-sandbox-automation",
      "/projects/yoga-nidra",
      "/projects/no-such-project",
    ]) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));
      const html = await response.text();

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(html).toContain(NOINDEX);
      expect(html).toContain('<div id="root"></div>');
      expect(html).not.toContain("og:title");
    }
  });

  test("keeps a content URL an indexable 200 when the back-end cannot say whether it exists", async () => {
    // A 404 here during an outage or a rate-limit burst would de-index real pages.
    for (const fetchBackend of [
      () => Promise.reject(new Error("connect ECONNREFUSED 127.0.0.1:3001")),
      () => Promise.resolve(new Response("", { status: 503 })),
      () => Promise.resolve(new Response("", { status: 429 })),
    ]) {
      const handle = createRequestHandler({ distDir, fetchBackend, onBackendUnavailable: ignoreUnavailable });

      for (const path of ["/articles/yoga-nidra", "/projects/no-such-project"]) {
        const response = await handle(new Request(`https://buildwithtim.dev${path}`));

        expect(response.status).toBe(200);
        expect(await response.text()).toBe(INDEX_HTML);
      }
    }
  });

  test("reports each back-end lookup it could not complete, with the reason", async () => {
    // Without this an outage only shows as missing previews: a refused or timed-out
    // connection never reaches the back-end's own request log.
    const cases: [() => Promise<Response>, string][] = [
      [() => Promise.reject(new Error("connect ECONNREFUSED 127.0.0.1:3001")), "Error: connect ECONNREFUSED 127.0.0.1:3001"],
      [() => Promise.resolve(new Response("", { status: 503 })), "status 503"],
    ];

    for (const [fetchBackend, reason] of cases) {
      const reports: [string, string][] = [];
      const handle = createRequestHandler({
        distDir,
        fetchBackend,
        onBackendUnavailable: (lookup, why) => reports.push([lookup, why]),
      });

      await handle(new Request("https://buildwithtim.dev/articles/yoga-nidra"));
      await handle(new Request("https://buildwithtim.dev/feed.xml"));

      expect(reports).toEqual([["content item", reason], ["content list", reason]]);
    }
  });

  test("does not report a back-end 404 or a lookup that succeeded", async () => {
    const reports: [string, string][] = [];
    const handle = createRequestHandler({
      distDir,
      fetchBackend: backend,
      onBackendUnavailable: (lookup, why) => reports.push([lookup, why]),
    });

    await handle(new Request("https://buildwithtim.dev/articles/yoga-nidra"));
    await handle(new Request("https://buildwithtim.dev/articles/no-such-article"));
    await handle(new Request("https://buildwithtim.dev/sitemap.xml"));

    expect(reports).toEqual([]);
  });

  test("serves a project URL as the app shell carrying that project's canonical URL and link-preview tags", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    const response = await handle(new Request("https://buildwithtim.dev/projects/pi-sandbox-automation"));
    const html = await response.text();

    expect(response.status).toBe(200);
    expect(html).toContain("<title>Pi Sandbox Automation | Build with Tim</title>");
    expect(html).toContain('<link rel="canonical" href="https://buildwithtim.dev/projects/pi-sandbox-automation" />');
    expect(html).toContain('<meta property="og:url" content="https://buildwithtim.dev/projects/pi-sandbox-automation" />');
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain('<div id="root"></div>');
  });

  test("serves every client route as an indexable 200 app shell, matched like the router matches it", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    // React Router ignores case and a trailing slash, so these render real pages too.
    for (const path of ["/projects", "/projects/", "/articles", "/Articles", "/tags/docker", "/now", "/uses/"]) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));

      expect(response.status).toBe(200);
      expect(await response.text()).toBe(INDEX_HTML);
    }

    const mixedCase = await handle(new Request("https://buildwithtim.dev/Articles/yoga-nidra/"));

    expect(mixedCase.status).toBe(200);
    expect(await mixedCase.text()).toContain('<link rel="canonical" href="https://buildwithtim.dev/articles/yoga-nidra" />');
  });

  test("serves every route App.tsx declares as an indexable 200, so the server's route list cannot fall behind it", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });
    const paths = createRoutesFromChildren(AppRoutes().props.children)
      .map((route) => route.path)
      .filter((path) => path !== "*");

    expect(paths).toContain("/now");

    for (const path of paths) {
      const url = ROUTE_SAMPLES[path ?? ""] ?? path ?? "";

      // A new parameterised route needs a real URL in ROUTE_SAMPLES.
      expect(url).not.toContain(":");

      const response = await handle(new Request(`https://buildwithtim.dev${url}`));

      expect({ url, status: response.status }).toEqual({ url, status: 200 });
      expect(await response.text()).not.toContain(NOINDEX);
    }
  });

  test("answers a path no client route matches with the app shell as a noindex 404", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    // "/images" is a build directory, not a page.
    for (const path of ["/blog/foo", "/images", "/tags", "/projects/pi-sandbox-automation/extra", "/tags/docker/extra", "/nowhere", "/now/extra"]) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));
      const html = await response.text();

      expect(response.status).toBe(404);
      expect(response.headers.get("content-type")).toContain("text/html");
      expect(html).toContain(NOINDEX);
      expect(html).toContain('<div id="root"></div>');
    }
  });

  test("serves built files as-is", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    const image = await handle(new Request("https://buildwithtim.dev/images/me.png"));

    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await image.arrayBuffer())).toEqual(new Uint8Array(readFileSync(join(distDir, "images", "me.png"))));
  });

  test("never serves a file from outside the build directory", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    for (const path of ["/../secret.txt", "/%2e%2e/secret.txt", "/..%2fsecret.txt", "/images/..%2f..%2fsecret.txt"]) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));
      const html = await response.text();

      expect(html).not.toContain("outside dist");
      expect(html).toContain('<div id="root"></div>');
    }
  });

  test("answers /favicon.ico with a 404 instead of the app shell, and still serves /favicon.svg", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    const ico = await handle(new Request("https://buildwithtim.dev/favicon.ico"));

    expect(ico.status).toBe(404);
    expect(await ico.text()).not.toContain('<div id="root"></div>');

    const svg = await handle(new Request("https://buildwithtim.dev/favicon.svg"));

    expect(svg.status).toBe(200);
    expect(svg.headers.get("content-type")).toContain("image/svg+xml");
    expect(await svg.text()).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
  });

  test("serves the web app manifest with its manifest media type", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    const manifest = await handle(new Request("https://buildwithtim.dev/manifest.webmanifest"));

    expect(manifest.status).toBe(200);
    expect(manifest.headers.get("content-type")).toContain("application/manifest+json");
    expect(await manifest.text()).toBe('{"name":"Build with Tim"}');
  });

  test("builds preview URLs with the visitor's scheme when TLS ends at the tunnel", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

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
      onBackendUnavailable: ignoreUnavailable,
    });

    await handle(new Request("https://buildwithtim.dev/articles/yoga-nidra", { headers: { "cf-connecting-ip": "203.0.113.7" } }));
    await handle(new Request("https://buildwithtim.dev/articles/yoga-nidra"));

    expect(visitorIps).toEqual(["203.0.113.7", null]);
  });

  test("serves a robots.txt that allows crawling and points at the sitemap on the visitor's origin", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    const response = await handle(new Request("http://buildwithtim.dev/robots.txt", {
      headers: { "x-forwarded-proto": "https" },
    }));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(await response.text()).toBe("User-agent: *\nAllow: /\n\nSitemap: https://buildwithtim.dev/sitemap.xml\n");
  });

  test("serves an llms.txt naming the site and linking its sections, articles and projects on the visitor's origin", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

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
      onBackendUnavailable: ignoreUnavailable,
    });

    const response = await handle(new Request("https://buildwithtim.dev/llms.txt"));
    const text = await response.text();

    expect(response.status).toBe(200);
    expect(text).toContain("- [Articles](https://buildwithtim.dev/articles)");
    expect(text).not.toContain("yoga-nidra");
  });

  test("serves a sitemap of the fixed pages and every published article and project", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

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
      onBackendUnavailable: ignoreUnavailable,
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
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

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
      onBackendUnavailable: ignoreUnavailable,
    });

    const response = await handle(new Request("https://buildwithtim.dev/feed.xml"));

    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("<feed");
  });

  test("serves the homepage with the rebrand title, description, canonical URL and preview tags on the visitor's origin", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

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
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    const html = await (await handle(new Request("http://localhost:3000/"))).text();

    expect(html).toContain('<link rel="canonical" href="http://localhost:3000/" />');
  });

  test("keeps the real app shell free of duplicate or conflicting title and preview tags on home and article pages", async () => {
    const realDist = join(root, "real-dist");

    mkdirSync(realDist, { recursive: true });
    writeFileSync(join(realDist, "index.html"), readFileSync(join(import.meta.dir, "../../../front-end/index.html")));
    const handle = createRequestHandler({
      distDir: realDist,
      fetchBackend: backend,
      onBackendUnavailable: ignoreUnavailable,
    });

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
    const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

    for (const path of ["/", "/articles/yoga-nidra", "/blog/foo", "/images/me.png", "/robots.txt", "/llms.txt", "/sitemap.xml", "/feed.xml", "/health"]) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));

      expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });

  describe("GET /health", () => {
    // Why: every real page response is served from dist/index.html too, so a
    // probe that never checks it could report "ok" while every visitor
    // request already 500s (mirrors the back-end's contentDir check, #707).
    test("reports ok when the built site is present", async () => {
      const handle = createRequestHandler({ distDir, fetchBackend: backend, onBackendUnavailable: ignoreUnavailable });

      const response = await handle(new Request("https://buildwithtim.dev/health"));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(body).toMatchObject({ status: "ok", name: "website", error: null });
      expect(body.uptime).toBeGreaterThanOrEqual(0);
    });

    test("reports 503 when dist/index.html is missing", async () => {
      const emptyDir = mkdtempSync(join(tmpdir(), "front-end-no-dist-"));

      try {
        const handle = createRequestHandler({
          distDir: emptyDir,
          fetchBackend: backend,
          onBackendUnavailable: ignoreUnavailable,
        });

        const response = await handle(new Request("https://buildwithtim.dev/health"));
        const body = await response.json();

        expect(response.status).toBe(503);
        expect(body).toMatchObject({ status: "error", name: "website" });
        expect(body.error).toContain("dist/index.html");
      } finally {
        rmSync(emptyDir, { recursive: true, force: true });
      }
    });
  });
});
