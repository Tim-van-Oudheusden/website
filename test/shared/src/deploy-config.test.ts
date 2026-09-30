import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readDeploy(relativePath: string): string {
  const fullPath = resolve(import.meta.dirname, "../../..", relativePath);
  return readFileSync(fullPath, "utf8");
}

describe("cloudflared ingress config", () => {
  test("routes /api/* and /content-assets/* to the back-end", () => {
    const text = readDeploy("deploy/cloudflared/config.yml");
    expect(text).toContain('path: "^/api(/.*)?$"');
    expect(text).toContain('path: "^/content-assets(/.*)?$"');
    expect(text).toContain("service: http://localhost:3001");
  });

  test("routes everything else to the front-end via a catch-all", () => {
    const text = readDeploy("deploy/cloudflared/config.yml");
    expect(text).toContain("- service: http://localhost:3000");
  });

  test("contains no secret material (token/credentials)", () => {
    const text = readDeploy("deploy/cloudflared/config.yml");
    expect(text).not.toContain("token:");
    expect(text).not.toContain("credentials");
    expect(text).not.toContain("TUNNEL_TOKEN");
  });
});

describe("cloudflared quadlet", () => {
  test("runs the pinned cloudflared image with registry auto-update", () => {
    const text = readDeploy("deploy/cloudflared/cloudflared.container");
    expect(text).toContain("docker.io/cloudflare/cloudflared");
    expect(text).toContain("AutoUpdate=registry");
  });

  test("injects the token from a host env file, never inline", () => {
    const text = readDeploy("deploy/cloudflared/cloudflared.container");
    expect(text).toContain("EnvironmentFile=%h/.cloudflared/cloudflared.env");
    expect(text).not.toContain("Environment=TUNNEL_TOKEN");
  });

  test("uses the host network so localhost targets the kube pod", () => {
    const text = readDeploy("deploy/cloudflared/cloudflared.container");
    expect(text).toContain("Network=host");
    expect(text).toContain("config.yml");
  });
});

describe("website image update timer", () => {
  test("pulls the exact images the prod pod manifest runs", () => {
    const service = readDeploy("deploy/systemd/website-update.service");
    const prod = readDeploy("deploy/kube/prod.yaml");

    for (const ref of [
      "ghcr.io/tim-van-oudheusden/website/front-end:latest",
      "ghcr.io/tim-van-oudheusden/website/back-end:latest",
    ]) {
      expect(service).toContain(`podman pull ${ref}`);
      expect(prod).toContain(ref);
    }
  });

  test("restarts the kube pod after pulling", () => {
    const service = readDeploy("deploy/systemd/website-update.service");
    expect(service).toContain("restart podman-kube@website");
  });

  test("timer fires every 5 minutes and is persistent", () => {
    const timer = readDeploy("deploy/systemd/website-update.timer");
    expect(timer).toContain("OnCalendar=*:0/5");
    expect(timer).toContain("Persistent=true");
  });
});