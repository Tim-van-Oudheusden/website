import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readSandboxScript(): string {
  const fullPath = resolve(import.meta.dirname, "../..", "run-pi-sandbox.sh");
  return readFileSync(fullPath, "utf8");
}

describe("pi sandbox script", () => {
  test("syncs host Pi extensions into the sandbox agent directory", () => {
    const script = readSandboxScript();

    expect(script).toContain("$HOST_PI_DIR/extensions");
    expect(script).toContain("$PI_DIR/extensions");
  });
});
