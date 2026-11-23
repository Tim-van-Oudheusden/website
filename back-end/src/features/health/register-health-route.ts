import { constants } from "fs";
import { access } from "fs/promises";

import type { FastifyInstance, FastifyReply } from "fastify";

import type { HealthCheckResponse } from "shared";
import { APP_NAME, ROUTES } from "shared";

/**
 * Registers GET /health. Every content route the back-end serves reads from
 * `contentDir`, so a health check that never looks at it can report "ok"
 * while every real request 404s or 500s on a missing/unmounted directory.
 * This checks the directory is readable and fails the probe (503) when it
 * is not, so orchestrators and the CI/e2e wait loops see the real state.
 * The errno code goes to the log, not the response: the liveness probe
 * restarts the container on this 503, and the journal should say why.
 */
export function registerHealthRoute(app: FastifyInstance, contentDir: string): void {
  app.get(ROUTES.HEALTH, async (request, reply: FastifyReply): Promise<HealthCheckResponse> => {
    const uptime = Math.round(process.uptime());

    try {
      await access(contentDir, constants.R_OK);
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";

      request.log.warn({ code, contentDir }, "content directory is not accessible");
      reply.code(503);

      return {
        status: "error",
        name: APP_NAME,
        uptime,
        error: "content directory is not accessible",
      };
    }

    return { status: "ok", name: APP_NAME, uptime, error: null };
  });
}
