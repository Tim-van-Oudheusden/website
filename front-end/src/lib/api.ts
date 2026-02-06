/**
 * Lightweight API client for communicating with the back-end.
 *
 * In development, Vite proxies `/api/*` to the Fastify server.
 * The proxy rewrites the path, stripping the `/api` prefix,
 * so `/api/hello` → `http://localhost:3001/hello`.
 */

const API_BASE = "/api";

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
