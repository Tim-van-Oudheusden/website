import type { FastifyInstance } from "fastify";
import { APP_NAME, ROUTES, type HealthCheckResponse } from "shared";

export function registerHealthRoute(app: FastifyInstance): void {
  app.get(ROUTES.HEALTH, (): HealthCheckResponse => {
    return {
      status: "ok",
      name: APP_NAME,
      uptime: Math.round(process.uptime()),
    };
  });
}
