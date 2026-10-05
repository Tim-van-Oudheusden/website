import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance, FastifyRequest } from "fastify";

const GLOBAL_MAX_REQUESTS = 50;
const GLOBAL_TIME_WINDOW = "1 minute";
const NOT_FOUND_MAX_REQUESTS = 10;
const NOT_FOUND_TIME_WINDOW = "1 minute";
const CF_CONNECTING_IP_HEADER = "cf-connecting-ip";

/**
 * Whether an address is the local loopback, where cloudflared terminates.
 *
 * Behind Cloudflare Tunnel the origin sees `127.0.0.1` for every client, and
 * the real client identity arrives in `CF-Connecting-IP` / `X-Forwarded-For`.
 * Those headers are trustworthy only when the immediate peer is loopback (the
 * local tunnel) — an arbitrary caller can set them to spoof identity.
 */
export function isLoopbackAddress(address: string | undefined): boolean {
  return address === "127.0.0.1"
    || address === "::1"
    || address === "::ffff:127.0.0.1";
}

/**
 * Rate-limit key: use Cloudflare's `CF-Connecting-IP` when the peer is the
 * local tunnel, otherwise the socket IP, so a directly-connected caller cannot
 * pick its own identity via headers.
 */
function keyGenerator(request: FastifyRequest): string {
  const socketAddress = request.raw.socket.remoteAddress;
  const cfConnectingIp = request.headers[CF_CONNECTING_IP_HEADER];

  if (
    isLoopbackAddress(socketAddress)
    && typeof cfConnectingIp === "string"
    && cfConnectingIp.length > 0
  ) {
    return cfConnectingIp;
  }

  return socketAddress ?? "unknown";
}

export async function registerRateLimiting(app: FastifyInstance): Promise<void> {
  await app.register(rateLimit, {
    global: true,
    max: GLOBAL_MAX_REQUESTS,
    timeWindow: GLOBAL_TIME_WINDOW,
    keyGenerator,
  });

  app.setNotFoundHandler(
    {
      preHandler: app.rateLimit({
        max: NOT_FOUND_MAX_REQUESTS,
        timeWindow: NOT_FOUND_TIME_WINDOW,
        keyGenerator,
      }),
    },
    (_request, reply) => {
      return reply.status(404).send({ error: "Not Found" });
    },
  );
}
