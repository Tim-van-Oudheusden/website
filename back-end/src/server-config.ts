import { BACKEND_PORT } from "shared";

type Env = Record<string, string | undefined>;

export function getServerConfig(env: Env): { host: string; port: number } {
  const host = env["HOST"] ?? "127.0.0.1";
  const parsedPort = Number(env["PORT"]);
  const port = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : BACKEND_PORT;

  return { host, port };
}
