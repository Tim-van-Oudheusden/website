import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readDockerfile(relativePath: string): string {
  const fullPath = resolve(import.meta.dirname, "../..", relativePath);
  return readFileSync(fullPath, "utf8");
}

describe("docker dependency installs are deterministic", () => {
  test("deps stages do not fall back from frozen-lockfile installs", () => {
    const backendDockerfile = readDockerfile("back-end/Dockerfile");
    const frontendDockerfile = readDockerfile("front-end/Dockerfile");

    expect(backendDockerfile).not.toContain("bun install --frozen-lockfile || bun install");
    expect(frontendDockerfile).not.toContain("bun install --frozen-lockfile || bun install");
  });

  test("front-end production image does not install serve during docker build", () => {
    const frontendDockerfile = readDockerfile("front-end/Dockerfile");

    expect(frontendDockerfile).not.toContain("RUN bun add serve");
  });
});
