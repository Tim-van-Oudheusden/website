import Fastify from "fastify";
import { APP_NAME, type HealthCheckResponse } from "shared";

const HOST = process.env["HOST"] ?? "0.0.0.0";
const PORT = Number(process.env["PORT"] ?? 3001);

const app = Fastify({
  logger: {
    level: process.env["LOG_LEVEL"] ?? "info",
  },
});

// Health check endpoint
app.get("/health", (): HealthCheckResponse => {
  return { status: "ok", name: APP_NAME, uptime: process.uptime() };
});

// Root endpoint
app.get("/", () => {
  return { name: APP_NAME, version: "0.1.0" };
});

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
