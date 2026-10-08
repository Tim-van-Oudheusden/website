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
