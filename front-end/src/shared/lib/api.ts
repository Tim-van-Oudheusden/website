/**
 * Lightweight API client for communicating with the back-end.
 *
 * In development, Vite proxies `/api/*` to the Fastify server unchanged.
 * The back-end serves the `/api` prefix itself, so dev and prod
 * (Cloudflare Tunnel ingress) share the same request paths.
 */

import { API_BASE } from "shared";

export class ApiError extends Error {
  public readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/**
 * Generic fetch wrapper that prepends the API base path and handles errors.
 */
// eslint-disable-next-line no-restricted-syntax -- `init` mirrors the optional `RequestInit` of `fetch(input, init?)`
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;

  const headers = new Headers(init?.headers);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new ApiError(
      `Request failed: ${response.statusText}`,
      response.status,
    );
  }

  return response.json() as Promise<T>;
}

/**
 * GET request to the back-end.
 */
export async function apiGet<T>(path: string): Promise<T> {
  return apiFetch<T>(path, { method: "GET" });
}
