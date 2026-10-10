import { describe, expect, test } from "bun:test";

import { BACKEND_PORT } from "shared";

import { getServerConfig } from "../../../../back-end/src/core/server-config";

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

  test("listens on HOST when it is set", () => {
    // The Dockerfile and both kube manifests set HOST=0.0.0.0 so peer
    // containers and published ports can reach the API.
    const config = getServerConfig({ HOST: "0.0.0.0" });

    expect(config.host).toBe("0.0.0.0");
    expect(config.port).toBe(BACKEND_PORT);
  });

  test.each([
    ["8080", 8080],
    ["1", 1],
    ["65535", 65535],
  ])("uses PORT=%s when it is an integer from 1 to 65535", (port, expected) => {
    expect(getServerConfig({ PORT: port }).port).toBe(expected);
  });

  test.each([
    ["zero", "0"],
    ["above the port range", "65536"],
    ["negative", "-1"],
    ["fractional", "3001.5"],
    ["empty", ""],
  ])("falls back to shared back-end port when PORT is %s", (_label, port) => {
    expect(getServerConfig({ PORT: port }).port).toBe(BACKEND_PORT);
  });

  test("applies HOST and PORT together", () => {
    expect(getServerConfig({ HOST: "0.0.0.0", PORT: "8080" })).toEqual({ host: "0.0.0.0", port: 8080 });
  });
});
