import helmet from "@fastify/helmet";
import type { FastifyInstance } from "fastify";

export function registerSecurityHeaders(app: FastifyInstance): void {
  app.register(helmet, {
    global: true,
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: "no-referrer" },
  });
}
