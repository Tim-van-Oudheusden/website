/**
 * Production entry for the front-end container: serves the Vite build and adds
 * per-article link-preview tags (see handler.ts). The Dockerfile bundles this
 * file with `bun build`, so the image needs no node_modules.
 *
 * Environment:
 *   PORT            listen port (default 3000, the pod's front-end container port)
 *   BACKEND_ORIGIN  back-end base URL (default http://127.0.0.1:BACKEND_PORT —
 *                   both containers share the pod's network namespace)
 */
import { resolve } from "node:path";
import { BACKEND_PORT } from "shared";
import { createRequestHandler } from "./handler";

/** Link previews are best-effort: never hold a page load on a slow back-end. */
const BACKEND_TIMEOUT_MS = 2000;

const backendOrigin = process.env["BACKEND_ORIGIN"] ?? `http://127.0.0.1:${BACKEND_PORT}`;

const server = Bun.serve({
  hostname: "0.0.0.0",
  port: Number(process.env["PORT"] ?? 3000),
  fetch: createRequestHandler({
    // dist/ sits next to server/ both in the repo and in the image.
    distDir: resolve(import.meta.dir, "../dist"),
    fetchBackend: (path, headers) =>
      fetch(`${backendOrigin}${path}`, { headers, signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS) }),
  }),
});

// As the container's PID 1 the kernel ignores signals we don't handle, so
// `podman stop` / pod replays would wait 10 s and SIGKILL. Exit promptly.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void server.stop().then(() => process.exit(0));
  });
}
