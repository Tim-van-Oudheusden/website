import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readDockerCompose(): string {
  const fullPath = resolve(import.meta.dirname, "../..", "docker-compose.yml");
  return readFileSync(fullPath, "utf8");
}

describe("docker-compose front-end static assets", () => {
  test("front-end service mounts workspace public directory", () => {
    const compose = readDockerCompose();

    expect(compose).toContain("- ./public:/app/public:ro,z");
  });
});

describe("docker-compose podman compatibility", () => {
  test("bind mounts relabel host paths for SELinux rootless containers", () => {
    const compose = readDockerCompose();

    expect(compose).toContain("- ./package.json:/app/package.json:ro,z");
    expect(compose).toContain("- ./bun.lock:/app/bun.lock:z");
    expect(compose).toContain("- ./back-end:/app/back-end:z");
    expect(compose).toContain("- ./front-end:/app/front-end:z");
    expect(compose).toContain("- ./shared:/app/shared:z");
    expect(compose).toContain("- ./content:/app/content:ro,z");
    expect(compose).toContain("- ./public:/app/public:ro,z");
  });
});
