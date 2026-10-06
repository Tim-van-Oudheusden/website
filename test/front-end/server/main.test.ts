import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const mainEntry = resolve(import.meta.dir, "../../../front-end/server/main.ts");

const INDEX_HTML = `<!doctype html>
<html lang="en">
  <head>
    <title>Tim V.O.</title>
  </head>
  <body><div id="root"></div></body>
</html>`;

let root: string;
let serverScript: string;

// Mirror the prod image layout: the Dockerfile bundles main.ts into
// server/main.js and ships the Vite build as the sibling dist/.
beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), "front-end-main-"));
  mkdirSync(join(root, "dist"));
  writeFileSync(join(root, "dist", "index.html"), INDEX_HTML);

  const build = await Bun.build({ entrypoints: [mainEntry], target: "bun", outdir: join(root, "server") });

  if (!build.success) {
    throw new AggregateError(build.logs, "bundling front-end/server/main.ts failed");
  }

  serverScript = join(root, "server", "main.js");
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

interface RunningFrontEnd {
  child: Bun.Subprocess<"ignore", "ignore", "ignore">;
  baseUrl: string;
}

/** Start the bundled prod server and wait until it answers. */
async function startFrontEnd(env: Record<string, string> = {}): Promise<RunningFrontEnd> {
  const port = 40000 + Math.floor(Math.random() * 20000);
  const child = Bun.spawn(["bun", serverScript], {
    env: { ...process.env, PORT: String(port), ...env },
    stdout: "ignore",
    stderr: "ignore",
  });
  const baseUrl = `http://127.0.0.1:${port}`;

  // main.ts logs nothing, so readiness is the first answered request.
  for (;;) {
    try {
      await fetch(`${baseUrl}/`);

      return { child, baseUrl };
    } catch {
      if (child.exitCode !== null) {
        throw new Error(`front-end server exited early with code ${child.exitCode}`);
      }

      await Bun.sleep(20);
    }
  }
}

describe("front-end prod server process", () => {
  // In the container main.ts is PID 1, where the kernel ignores signals the
  // process does not handle: `podman stop` would wait 10 s and SIGKILL (#483).
  // A process that ignores the signal never resolves `exited`; the test timeout
  // then fails it.
  test.each(["SIGTERM", "SIGINT"] as const)("exits cleanly and promptly on %s", async (signal) => {
    const { child } = await startFrontEnd();

    try {
      child.kill(signal);

      expect(await child.exited).toBe(0);
      expect(child.signalCode).toBeNull();
    } finally {
      child.kill("SIGKILL");
    }
  }, 5000);

  test("fetches an article's link-preview data from BACKEND_ORIGIN", async () => {
    const backendPaths: string[] = [];

    using backend = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: (request) => {
        backendPaths.push(new URL(request.url).pathname);

        return Response.json({
          type: "article",
          title: "Yoga Nidra, a way to be at peace in chaos",
          description: "How I discovered Yoga Nidra.",
          date: "2026-09-01",
          tags: [],
          draft: false,
          category: "Personal Life",
          slug: "yoga-nidra",
          socialImage: null,
        });
      },
    });
    const { child, baseUrl } = await startFrontEnd({ BACKEND_ORIGIN: backend.url.origin });

    try {
      const html = await (await fetch(`${baseUrl}/articles/yoga-nidra`)).text();

      expect(backendPaths).toContain("/api/content/yoga-nidra");
      expect(html).toContain('<meta property="og:title" content="Yoga Nidra, a way to be at peace in chaos" />');
    } finally {
      child.kill("SIGKILL");
    }
  }, 5000);

  // Without the fetch timeout the page would wait on the back-end until Bun's
  // 10 s idle timeout, so the test timeout fails it.
  test("serves the plain app shell when the back-end stalls", async () => {
    using backend = Bun.serve({
      hostname: "127.0.0.1",
      port: 0,
      fetch: () => new Promise<Response>(() => undefined),
    });
    const { child, baseUrl } = await startFrontEnd({ BACKEND_ORIGIN: backend.url.origin });

    try {
      const response = await fetch(`${baseUrl}/articles/yoga-nidra`);

      expect(response.status).toBe(200);
      expect(await response.text()).toBe(INDEX_HTML);
    } finally {
      child.kill("SIGKILL");
    }
  }, 5000);
});
