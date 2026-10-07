import type { FastifyInstance } from "fastify";

import { recordRequest, renderPrometheusMetrics } from "./metrics";
import { isLoopbackAddress } from "./rate-limit";

const METRICS_ROUTE = "/metrics";
const MILLISECONDS_PER_SECOND = 1000;

/**
 * Records a bounded counter/histogram per response and exposes them at
 * `/metrics` in Prometheus text format, restricted to loopback callers the
 * same way the health probe's trusted-proxy check is (#app.ts) — this is a
 * local scrape target, not a publicly reachable endpoint.
 */
export function registerMetrics(app: FastifyInstance): void {
  app.addHook("onResponse", (request, reply, done) => {
    const route = request.routeOptions.url ?? "unmatched";
    const durationSeconds = reply.elapsedTime / MILLISECONDS_PER_SECOND;

    recordRequest(request.method, route, reply.statusCode, durationSeconds);
    done();
  });

  app.get(METRICS_ROUTE, (request, reply) => {
    if (!isLoopbackAddress(request.raw.socket.remoteAddress)) {
      return reply.status(404).send();
    }

    reply.header("content-type", "text/plain; version=0.0.4; charset=utf-8");

    return reply.send(renderPrometheusMetrics());
  });
}
