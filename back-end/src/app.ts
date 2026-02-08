import { resolve } from "path";
import Fastify, { type FastifyInstance } from "fastify";
import { registerRateLimiting } from "./core/rate-limit";
import { registerSecurityHeaders } from "./core/security-headers";
import { registerContentRoutes } from "./features/content/content-routes";
import { registerHealthRoute } from "./features/health/register-health-route";
import { registerHelloRoute } from "./features/hello/register-hello-route";
import { registerRootRoute } from "./features/root/register-root-route";

interface BuildAppOptions {
  contentDir?: string;
  logger?: boolean | Record<string, unknown>;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: options.logger ?? false,
  });

  registerSecurityHeaders(app);
  await registerRateLimiting(app);

  registerHealthRoute(app);
  registerHelloRoute(app);
  registerRootRoute(app);

  const contentDir = options.contentDir ?? resolve(import.meta.dirname, "../../content");
  registerContentRoutes(app, contentDir);

  return app;
}
