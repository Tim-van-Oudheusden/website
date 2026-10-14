import { isIPv6 } from "node:net";

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

const IPV6_GROUPS = 8;
const IPV6_PREFIX_GROUPS = 4;
const IPV4_MAPPED_GROUPS = ["0", "0", "0", "0", "0", "ffff"];

/** Hex groups of one `::`-side of an IPv6 address; a dotted IPv4 counts as two. */
function parseIpv6Groups(part: string): string[] {
  return (part === "" ? [] : part.split(":")).flatMap((group) => {
    if (!group.includes(".")) {
      return [Number.parseInt(group, 16).toString(16)];
    }

    const [a = 0, b = 0, c = 0, d = 0] = group.split(".").map(Number);

    return [(a * 256 + b).toString(16), (c * 256 + d).toString(16)];
  });
}

/**
 * Expands a valid IPv6 address to its 8 lower-case, unpadded hex groups; an
 * embedded dotted IPv4 tail is converted to its two hex groups.
 */
function expandIpv6Groups(address: string): string[] {
  const [head = "", tail = ""] = address.toLowerCase().split("::");
  const headGroups = parseIpv6Groups(head);
  const tailGroups = parseIpv6Groups(tail);
  const zeros = Array.from(
    { length: IPV6_GROUPS - headGroups.length - tailGroups.length },
    () => "0",
  );

  return [...headGroups, ...zeros, ...tailGroups];
}

/**
 * Rate-limit identity for a client address. One IPv6 client normally controls
 * a whole /64, so IPv6 addresses collapse to their /64 prefix; IPv4-mapped
 * IPv6 collapses to the plain IPv4 address. Anything else is returned as-is.
 */
export function rateLimitClientKey(address: string): string {
  const unzoned = address.split("%")[0] ?? address;

  if (!isIPv6(unzoned)) {
    return address;
  }

  const groups = expandIpv6Groups(unzoned);

  if (IPV4_MAPPED_GROUPS.every((group, index) => groups[index] === group)) {
    return groups.slice(6).flatMap((group) => {
      const value = Number.parseInt(group, 16);

      return [Math.floor(value / 256), value % 256];
    }).join(".");
  }

  return `${groups.slice(0, IPV6_PREFIX_GROUPS).join(":")}::/64`;
}
