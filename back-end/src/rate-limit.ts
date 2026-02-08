import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

const GLOBAL_MAX_REQUESTS = 50;
const GLOBAL_TIME_WINDOW = "1 minute";
const NOT_FOUND_MAX_REQUESTS = 10;
const NOT_FOUND_TIME_WINDOW = "1 minute";

export async function registerRateLimiting(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: GLOBAL_MAX_REQUESTS,
    timeWindow: GLOBAL_TIME_WINDOW,
  });

  app.setNotFoundHandler(
    {
      preHandler: app.rateLimit({
        max: NOT_FOUND_MAX_REQUESTS,
        timeWindow: NOT_FOUND_TIME_WINDOW,
      }),
    },
    (_request, reply) => {
      return reply.status(404).send({ error: "Not Found" });
    },
  );
}
