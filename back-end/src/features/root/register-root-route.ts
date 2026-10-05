import type { FastifyInstance } from "fastify";

import { APP_NAME, ROUTES } from "shared";

export function registerRootRoute(app: FastifyInstance): void {
  app.get(ROUTES.ROOT, () => ({ name: APP_NAME, version: "0.1.0" }));
}
