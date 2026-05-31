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

  test("pi sandbox image includes common agent command line tools", () => {
    const sandboxDockerfile = readDockerfile("Dockerfile.sandbox");

    for (const packageName of [
      "curl",
      "jq",
      "less",
      "npm",
      "openssh-client",
      "procps",
      "ripgrep",
    ]) {
      expect(sandboxDockerfile).toContain(packageName);
    }

    expect(sandboxDockerfile).toContain("@beads/bd@1.0.5");
    expect(sandboxDockerfile).toContain("ln -sf /home/bun/.bun/bin/bd /usr/local/bin/bd");
  });

  test("pi sandbox image installs the superlocalmemory CLI used by the extension", () => {
    const sandboxDockerfile = readDockerfile("Dockerfile.sandbox");

    expect(sandboxDockerfile).toContain("superlocalmemory@3.5.5");
    expect(sandboxDockerfile).toContain("ln -sf /home/bun/.bun/bin/slm /usr/local/bin/slm");
    expect(sandboxDockerfile).toContain("ln -sf /home/bun/.bun/bin/superlocalmemory /usr/local/bin/superlocalmemory");
  });
});
