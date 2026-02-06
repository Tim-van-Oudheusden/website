/**
 * Shared module — types, utilities, and constants used by both front-end and back-end.
 */

export const APP_NAME = "website";

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
