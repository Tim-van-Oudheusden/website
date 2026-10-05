import type { FastifyInstance } from "fastify";

import type { HelloResponse } from "shared";
import { ROUTES } from "shared";

export function registerHelloRoute(app: FastifyInstance): void {
  app.get(ROUTES.HELLO, (): HelloResponse => ({
    message: "hello",
    timestamp: new Date().toISOString(),
  }));
}
