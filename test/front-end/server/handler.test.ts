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
  writeFileSync(join(root, "secret.txt"), "outside dist");
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

/** A back-end that knows one article and one project, at their real API paths. */
function backend(path: string): Promise<Response> {
  if (path === "/api/content/yoga-nidra") {
    return Promise.resolve(Response.json(ARTICLE));
  }

  if (path === "/api/content/pi-sandbox-automation") {
    return Promise.resolve(Response.json({ ...ARTICLE, type: "project", slug: "pi-sandbox-automation", title: "Pi Sandbox Automation" }));
  }

  return Promise.resolve(Response.json({ error: "Content not found" }, { status: 404 }));
}

describe("front-end request handler", () => {
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

    for (const path of ["/", "/projects", "/projects/pi-sandbox-automation", "/images"]) {
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

  test("sends the back-end's framing and MIME-sniffing protections on every response", async () => {
    const handle = createRequestHandler({ distDir, fetchBackend: backend });

    for (const path of ["/", "/articles/yoga-nidra", "/images/me.png"]) {
      const response = await handle(new Request(`https://buildwithtim.dev${path}`));

      expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });
});
