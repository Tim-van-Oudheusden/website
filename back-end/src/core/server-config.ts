import { BACKEND_PORT } from "shared";

type Env = Record<string, string | undefined>;

export function getServerConfig(env: Env): { host: string; port: number } {
  const host = env["HOST"] ?? "127.0.0.1";
  const parsedPort = Number(env["PORT"]);
  let port = BACKEND_PORT;

  if (Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
    port = parsedPort;
  }

  return { host, port };
}

/** Where the Hive metrics come from; `null` when unset. */
export interface HiveConfig {
  /** Hive gateway origin, e.g. `http://host.containers.internal:3001`. */
  baseUrl: string | null;
  /** Read-only token for Hive's `/api/widget/summary`. */
  widgetToken: string | null;
  /** Without a base URL, production answers unavailable and development serves a fixture. */
  production: boolean;
}

/** The value of a set, non-empty variable, else null. */
function nonEmpty(value: string | undefined): string | null {
  return value === undefined || value === "" ? null : value;
}

export function getHiveConfig(env: Env): HiveConfig {
  return {
    baseUrl: nonEmpty(env["HIVE_BASE_URL"]),
    widgetToken: nonEmpty(env["HIVE_WIDGET_TOKEN"]),
    production: env["NODE_ENV"] === "production",
  };
}
