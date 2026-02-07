/**
 * Shared module — types, utilities, and constants used by both front-end and back-end.
 */

export const APP_NAME = "website";

/* ── Network Constants ── */

/** Default port the back-end listens on. */
export const BACKEND_PORT = 3001;

/** Default port the front-end dev server binds to. */
export const FRONTEND_PORT = 5173;

/**
 * Default hostname for the back-end when reached from the front-end dev proxy.
 *
 * - On the **host** machine: `localhost` (both processes share the same network)
 * - In **Docker**: overridden via `VITE_BACKEND_HOST` env var to the Docker
 *   service name (e.g. `back-end`) since each container has its own network
 *   namespace and `localhost` refers to the front-end container itself.
 */
export const BACKEND_HOST = "localhost";

/* ── Route Constants ── */

/**
 * Base path prefix used by the front-end API client.
 *
 * In development the Vite dev proxy rewrites `/api/*` → `http://<backend-host>:<PORT>/*`,
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
  CONTENT: "/content",
  CONTENT_BY_SLUG: "/content/:slug",
} as const;

/* ── Content Schema ── */

/** The valid content types for Obsidian frontmatter entries. */
export const CONTENT_TYPES = ["article", "project"] as const;

/** Union type of valid content types. */
export type ContentType = (typeof CONTENT_TYPES)[number];

/**
 * Frontmatter fields expected in Obsidian markdown files.
 *
 * This is the contract between the back-end (which parses frontmatter)
 * and the front-end (which displays it).
 */
export interface ContentFrontmatter {
  title: string;
  description: string;
  /** ISO 8601 date string. */
  date: string;
  tags: string[];
  type: ContentType;
  draft: boolean;
  /** Derived from filename if absent. */
  slug?: string | undefined;
}

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
