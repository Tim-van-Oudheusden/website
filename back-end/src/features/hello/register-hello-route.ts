import type { FastifyInstance } from "fastify";
import { ROUTES, type HelloResponse } from "shared";

export function registerHelloRoute(app: FastifyInstance): void {
  app.get(ROUTES.HELLO, (): HelloResponse => {
    return {
      message: "hello",
      timestamp: new Date().toISOString(),
    };
  });
}
