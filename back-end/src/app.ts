import type { FastifyInstance } from "fastify";
import Fastify from "fastify";

import { API_BASE } from "shared";

import { isLoopbackAddress, registerRateLimiting } from "./core/rate-limit";
import { registerMetrics } from "./core/register-metrics";
import { registerSecurityHeaders } from "./core/security-headers";
import {
  registerContentImageRoutes,
  registerContentRoutes,
} from "./features/content/content-routes";
import { registerHealthRoute } from "./features/health/register-health-route";
import { registerHelloRoute } from "./features/hello/register-hello-route";
import { registerPageRoutes } from "./features/pages/page-routes";
import { registerRootRoute } from "./features/root/register-root-route";
import { registerViewBeaconRoute, registerViewStatsRoute } from "./features/views/register-views-routes";
import type { ViewStore } from "./features/views/view-store";
import { createViewStore } from "./features/views/view-store";

interface BuildAppOptions {
  /** Directory holding the markdown content and its `images/` folder. */
  contentDir: string;
  logger: boolean | Record<string, unknown>;
}

/**
 * @param viewStore Per-article view counts; defaults to an in-memory store
 *   (not persisted). The app closes it on shutdown.
 */
export async function buildApp(
  options: BuildAppOptions,
  viewStore: ViewStore = createViewStore(":memory:"),
): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger,
    // Honor proxied client metadata (X-Forwarded-For, X-Forwarded-Proto) only
    // when the immediate peer is loopback — i.e. the local cloudflared tunnel —
    // never from arbitrary callers who can set those headers themselves.
    trustProxy: isLoopbackAddress,
  });

  registerSecurityHeaders(app);
  await registerRateLimiting(app);
  registerMetrics(app);

  const { contentDir } = options;

  app.addHook("onClose", (_instance, done) => {
    viewStore.close();
    done();
  });

  registerViewStatsRoute(app, viewStore);

  // Probe endpoint stays at the root: kube probes, the CI wait loop, and the
  // README all target /health.
  registerHealthRoute(app, contentDir);

  // JSON API routes live under API_BASE so dev (Vite proxy, no rewrite) and
  // prod (cloudflared ingress) share the same request paths.
  await app.register((api) => {
    registerHelloRoute(api);
    registerRootRoute(api);
    registerContentRoutes(api, contentDir);
    registerPageRoutes(api, contentDir);
    registerViewBeaconRoute(api, contentDir, viewStore);
  }, { prefix: API_BASE });

  // Static content images are an asset path, not an API call — stay at root.
  registerContentImageRoutes(app, contentDir);

  return app;
}
