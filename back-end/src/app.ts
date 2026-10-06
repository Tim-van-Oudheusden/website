import type { FastifyInstance } from "fastify";
import Fastify from "fastify";

import { API_BASE } from "shared";

import { isLoopbackAddress, registerRateLimiting } from "./core/rate-limit";
import { registerSecurityHeaders } from "./core/security-headers";
import {
  registerContentImageRoutes,
  registerContentRoutes,
} from "./features/content/content-routes";
import { registerHealthRoute } from "./features/health/register-health-route";
import { registerHelloRoute } from "./features/hello/register-hello-route";
import { registerRootRoute } from "./features/root/register-root-route";

interface BuildAppOptions {
  /** Directory holding the markdown content and its `images/` folder. */
  contentDir: string;
  logger: boolean | Record<string, unknown>;
}

export async function buildApp(options: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger,
    // Honor proxied client metadata (X-Forwarded-For, X-Forwarded-Proto) only
    // when the immediate peer is loopback — i.e. the local cloudflared tunnel —
    // never from arbitrary callers who can set those headers themselves.
    trustProxy: isLoopbackAddress,
  });

  registerSecurityHeaders(app);
  await registerRateLimiting(app);

  // Probe endpoint stays at the root: kube probes, the CI wait loop, and the
  // README all target /health.
  registerHealthRoute(app);

  const { contentDir } = options;

  // JSON API routes live under API_BASE so dev (Vite proxy, no rewrite) and
  // prod (cloudflared ingress) share the same request paths.
  await app.register((api) => {
    registerHelloRoute(api);
    registerRootRoute(api);
    registerContentRoutes(api, contentDir);
  }, { prefix: API_BASE });

  // Static content images are an asset path, not an API call — stay at root.
  registerContentImageRoutes(app, contentDir);

  return app;
}
