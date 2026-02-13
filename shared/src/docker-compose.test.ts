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

    expect(compose).toContain("- ./public:/app/public:ro");
  });
});
