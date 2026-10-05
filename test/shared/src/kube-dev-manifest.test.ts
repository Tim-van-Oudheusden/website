import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readDevManifest(): string {
  const fullPath = resolve(import.meta.dirname, "../../..", "deploy/kube/dev.yaml");

  return readFileSync(fullPath, "utf8");
}

// NOTE: podman kube play applies an SELinux shared label (:z) to hostPath
// volumes automatically, so the retired `:z` compose bind mounts are expressed
// here as hostPath volumes (plus `readOnly` where the compose file used `:ro`).

describe("podman kube dev manifest bind mounts", () => {
  test("mounts every workspace source directory as a hostPath volume", () => {
    const manifest = readDevManifest();

    for (const dir of ["front-end", "back-end", "shared", "content", "public"]) {
      expect(manifest).toContain(`path: ./${dir}`);
    }
  });

  test("mounts root package.json and bun.lock as hostPath files", () => {
    const manifest = readDevManifest();

    expect(manifest).toContain("path: ./package.json");
    expect(manifest).toContain("path: ./bun.lock");
  });

  test("mounts the read-only host paths as readOnly", () => {
    const manifest = readDevManifest();

    expect(manifest).toContain([
      "- name: public",
      "          mountPath: /app/public",
      "          readOnly: true",
    ].join("\n"));

    expect(manifest).toContain([
      "- name: content",
      "          mountPath: /app/content",
      "          readOnly: true",
    ].join("\n"));
  });

  test("publishes the dev ports to the host", () => {
    const manifest = readDevManifest();

    expect(manifest).toContain("containerPort: 5173");
    expect(manifest).toContain("hostPort: 5173");
    expect(manifest).toContain("containerPort: 3001");
    expect(manifest).toContain("hostPort: 3001");
  });
});
