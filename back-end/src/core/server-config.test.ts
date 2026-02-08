import { describe, expect, test } from "bun:test";
import { BACKEND_PORT } from "shared";
import { getServerConfig } from "./server-config";

describe("server config", () => {
  test("defaults to loopback host and shared back-end port", () => {
    const config = getServerConfig({});

    expect(config.host).toBe("127.0.0.1");
    expect(config.port).toBe(BACKEND_PORT);
  });

  test("falls back to shared back-end port when PORT is invalid", () => {
    const config = getServerConfig({ PORT: "not-a-number" });

    expect(config.port).toBe(BACKEND_PORT);
  });
});
