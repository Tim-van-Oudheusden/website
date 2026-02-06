/**
 * Shared module — types, utilities, and constants used by both front-end and back-end.
 */

export const APP_NAME = "website";

/* ── Route Constants ── */

/**
 * Base path prefix used by the front-end API client.
 *
 * In development the Vite dev proxy rewrites `/api/*` → `http://localhost:<PORT>/*`,
 * stripping this prefix before forwarding to the back-end.
 */
export const API_BASE = "/api";

/**
 * Canonical route paths used by both front-end and back-end.
 *
 * - The **back-end** registers handlers at these exact paths.
 * - The **front-end** prefixes them with `API_BASE` before fetching.
 */
export const ROUTES = {
  HELLO: "/hello",
  HEALTH: "/health",
  ROOT: "/",
} as const;

/* ── Shared Interfaces ── */

/**
 * Response returned by the GET /hello endpoint.
 *
 * This interface is consumed by both:
 *   - back-end:  to type the route handler return value
 *   - front-end: to type the API client response
 */
export interface HelloResponse {
  message: string;
  timestamp: string;
}

/**
 * Response returned by the GET /health endpoint.
 */
export interface HealthCheckResponse {
  status: ServiceStatus;
  name: string;
  uptime: number;
}

/* ── Shared Types ── */

/**
 * Union type representing the possible health statuses of a service.
 *
 * - "ok"       — service is running normally
 * - "degraded" — service is running with reduced functionality
 * - "error"    — service is experiencing failures
 */
export type ServiceStatus = "ok" | "degraded" | "error";
