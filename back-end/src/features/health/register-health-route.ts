import type { FastifyInstance } from "fastify";

import type { HealthCheckResponse } from "shared";
import { APP_NAME, ROUTES } from "shared";

export function registerHealthRoute(app: FastifyInstance): void {
  app.get(ROUTES.HEALTH, (): HealthCheckResponse => ({
    status: "ok",
    name: APP_NAME,
    uptime: Math.round(process.uptime()),
  }));
}
