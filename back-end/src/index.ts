import { resolve } from "path";
import Fastify from "fastify";
import { APP_NAME, BACKEND_PORT, ROUTES, type HealthCheckResponse, type HelloResponse } from "shared";
import { registerContentRoutes } from "./content-routes";

const HOST = process.env["HOST"] ?? "0.0.0.0";
const PORT = Number(process.env["PORT"] ?? BACKEND_PORT);

const app = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] ?? "info",
  },
});

/**
 * Health check endpoint — used by Docker HEALTHCHECK, load balancers,
 * and monitoring tools for periodic liveness/readiness probes.
 *
 * Returns 200 with a HealthCheckResponse body when the service is healthy.
 */
app.get(ROUTES.HEALTH, (): HealthCheckResponse => {
  return {
    status: "ok",
    name: APP_NAME,
    uptime: Math.round(process.uptime()),
  };
});

/**
 * Hello endpoint — responds with a greeting message.
 *
 * Called by the front-end HelloButton component via the Vite dev proxy
 * (GET /api/hello → GET /hello).
 */
app.get(ROUTES.HELLO, (): HelloResponse => {
  return {
    message: "hello",
    timestamp: new Date().toISOString(),
  };
});

// Root endpoint
app.get(ROUTES.ROOT, () => {
  return { name: APP_NAME, version: "0.1.0" };
});

// Content routes
const CONTENT_DIR = process.env["CONTENT_DIR"] ?? resolve(import.meta.dirname, "../../content");
registerContentRoutes(app, CONTENT_DIR);

async function start(): Promise<void> {
  try {
    await app.listen({ host: HOST, port: PORT });
    app.log.info(`${APP_NAME} back-end listening on ${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

void start();
