import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readDockerfile(relativePath: string): string {
  const fullPath = resolve(import.meta.dirname, "../../..", relativePath);

  return readFileSync(fullPath, "utf8");
}

describe("docker dependency installs are deterministic", () => {
  test("deps stages do not fall back from frozen-lockfile installs", () => {
    const backendDockerfile = readDockerfile("back-end/Dockerfile");
    const frontendDockerfile = readDockerfile("front-end/Dockerfile");

    expect(backendDockerfile).not.toContain("bun install --frozen-lockfile || bun install");
    expect(frontendDockerfile).not.toContain("bun install --frozen-lockfile || bun install");
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

    expect(sandboxDockerfile).toContain("@earendil-works/pi-coding-agent@1.1.0");
  });

  test("pi sandbox image installs the superlocalmemory CLI used by the extension", () => {
    const sandboxDockerfile = readDockerfile("Dockerfile.sandbox");

    expect(sandboxDockerfile).toContain("superlocalmemory@3.5.5");
    expect(sandboxDockerfile).toContain("ln -sf /home/bun/.bun/bin/slm /usr/local/bin/slm");
    expect(sandboxDockerfile).toContain("ln -sf /home/bun/.bun/bin/superlocalmemory /usr/local/bin/superlocalmemory");
  });
});

describe("prod image health checks", () => {
  // Why: both prod stages now register GET /health (back-end: contentDir,
  // front-end: dist/index.html); without a HEALTHCHECK a container can run
  // and keep accepting traffic while that dependency is unreadable, with
  // nothing in the image itself able to notice (#707).
  test("back-end and front-end prod stages probe /health with bun, not curl", () => {
    for (const [dockerfile, port] of [
      ["back-end/Dockerfile", 3001],
      ["front-end/Dockerfile", 3000],
    ] as const) {
      const text = readDockerfile(dockerfile);

      expect(text).toContain("HEALTHCHECK");
      expect(text).toContain(`http://localhost:${port}/health`);
      expect(text).not.toContain("CMD curl");
    }
  });
});
