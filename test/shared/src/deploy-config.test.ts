import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readDeploy(relativePath: string): string {
  const fullPath = resolve(import.meta.dirname, "../../..", relativePath);
  return readFileSync(fullPath, "utf8");
}

interface IngressRule {
  path?: string;
  service: string;
}

interface PodPort {
  hostPort: number;
  hostIP?: string;
}

function prodContainers(): { name: string; ports: PodPort[] }[] {
  const pod = Bun.YAML.parse(readDeploy("deploy/kube/prod.yaml")) as {
    spec: { containers: { name: string; ports: PodPort[] }[] };
  };
  return pod.spec.containers;
}

function prodHostOrigin(containerName: string): string {
  const container = prodContainers().find((c) => c.name === containerName);
  const [port] = container?.ports ?? [];
  return `http://${port?.hostIP}:${port?.hostPort}`;
}

function ingressRules(): IngressRule[] {
  const config = Bun.YAML.parse(readDeploy("deploy/cloudflared/config.yml")) as {
    ingress: IngressRule[];
  };
  return config.ingress;
}

describe("cloudflared ingress config", () => {
  test("routes /api/* and /content-assets/* to the prod back-end's published port", () => {
    const backEnd = prodHostOrigin("back-end");
    const rules = ingressRules();
    for (const path of ["^/api(/.*)?$", "^/content-assets(/.*)?$"]) {
      expect(rules.find((r) => r.path === path)?.service).toBe(backEnd);
    }
  });

  test("routes everything else to the prod front-end's published port via a catch-all", () => {
    const rules = ingressRules();
    const catchAll = rules.at(-1);
    expect(catchAll?.path).toBeUndefined();
    expect(catchAll?.service).toBe(prodHostOrigin("front-end"));
  });

  test("prod pod publishes only on loopback so the tunnel is the sole way in", () => {
    const published = prodContainers().flatMap((c) => c.ports.filter((p) => p.hostPort !== undefined));
    expect(published.length).toBeGreaterThan(0);
    for (const port of published) {
      expect(port.hostIP).toBe("127.0.0.1");
    }
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
    expect(text).toContain("EnvironmentFile=%E/cloudflared/cloudflared.env");
    expect(text).not.toContain("Environment=TUNNEL_TOKEN");
  });

  test("uses the host network so loopback targets the kube pod", () => {
    const text = readDeploy("deploy/cloudflared/cloudflared.container");
    expect(text).toContain("Network=host");
  });

  test("relabels the config.yml bind mount so SELinux-enforcing hosts can read it", () => {
    const text = readDeploy("deploy/cloudflared/cloudflared.container");
    const mount = text.split("\n").find((line) => line.startsWith("Volume=") && line.includes("config.yml"));
    const options = mount?.split(":").at(-1)?.split(",") ?? [];
    expect(options).toContain("Z");
  });
});

describe("website image update timer", () => {
  test("helper script pulls the exact images the prod pod manifest runs", () => {
    const script = readDeploy("deploy/systemd/website-update.sh");
    const prod = readDeploy("deploy/kube/prod.yaml");

    for (const ref of [
      "ghcr.io/tim-van-oudheusden/website/front-end:latest",
      "ghcr.io/tim-van-oudheusden/website/back-end:latest",
    ]) {
      expect(script).toContain(`podman pull ${ref}`);
      expect(prod).toContain(ref);
    }
  });

  test("replays the kube pod only when an image digest changed", () => {
    const script = readDeploy("deploy/systemd/website-update.sh");
    expect(script).toContain("podman image inspect");
    expect(script).toContain(".Digest");
    expect(script).toContain("restart podman-kube@website");
  });

  test("service unit runs the helper from the same WEBSITE_REPO as the pod template", () => {
    const repoDefault = (unit: string): string | undefined =>
      /^Environment=WEBSITE_REPO=(.+)$/m.exec(readDeploy(unit))?.[1];
    const service = readDeploy("deploy/systemd/website-update.service");

    expect(service).toContain("${WEBSITE_REPO}/deploy/systemd/website-update.sh");
    expect(repoDefault("deploy/systemd/website-update.service")).toBeDefined();
    expect(repoDefault("deploy/systemd/website-update.service")).toBe(
      repoDefault("deploy/systemd/podman-kube@.service"),
    );
  });

  test("timer fires every 5 minutes and is persistent", () => {
    const timer = readDeploy("deploy/systemd/website-update.timer");
    expect(timer).toContain("OnCalendar=*:0/5");
    expect(timer).toContain("Persistent=true");
  });
});

describe("podman-kube@ prod pod template", () => {
  test("plays deploy/kube/prod.yaml and tears it down on stop", () => {
    const template = readDeploy("deploy/systemd/podman-kube@.service");
    expect(template).toContain("podman kube play --replace");
    expect(template).toContain("deploy/kube/prod.yaml");
    expect(template).toContain("podman kube down");
  });

  test("has an [Install] section so systemctl --user enable works", () => {
    const template = readDeploy("deploy/systemd/podman-kube@.service");
    expect(template).toContain("WantedBy=default.target");
  });

  test("locates the manifest via WEBSITE_REPO, not a hardcoded clone path", () => {
    const template = readDeploy("deploy/systemd/podman-kube@.service");
    expect(template).toContain("Environment=WEBSITE_REPO=");
    expect(template).toContain("${WEBSITE_REPO}/deploy/kube/prod.yaml");
  });

  test("plays on pasta with host loopback spliced in, so the back-end sees cloudflared as loopback", () => {
    // Why: docs/deploy.md §1 (#479).
    const execStart = /^ExecStart=(.+)$/m.exec(readDeploy("deploy/systemd/podman-kube@.service"))?.[1] ?? "";
    const network = /--network[= ](\S+)/.exec(execStart)?.[1] ?? "";
    const [mode, options = ""] = network.split(/:(.*)/s);

    expect(mode).toBe("pasta");
    expect(options.split(",")).toContain("--host-lo-to-ns-lo");
  });

  test("update-timer restart target instance matches the prod pod name", () => {
    const script = readDeploy("deploy/systemd/website-update.sh");
    const prod = readDeploy("deploy/kube/prod.yaml");
    expect(script).toContain("restart podman-kube@website.service");
    expect(prod).toContain("name: website");
  });
});

describe("dev pod manifest", () => {
  test("disables SELinux labelling for every container with a hostPath mount", () => {
    // Why: kube play does not relabel bind mounts, so on SELinux hosts the
    // containers cannot read the user_home_t checkout (#500).
    const pod = Bun.YAML.parse(readDeploy("deploy/kube/dev.yaml")) as {
      metadata: { annotations?: Record<string, string> };
      spec: {
        containers: { name: string; volumeMounts?: { name: string }[] }[];
        volumes: { name: string; hostPath?: unknown }[];
      };
    };
    const hostPathVolumes = new Set(pod.spec.volumes.filter((v) => v.hostPath).map((v) => v.name));
    const bindMounting = pod.spec.containers
      .filter((c) => c.volumeMounts?.some((m) => hostPathVolumes.has(m.name)))
      .map((c) => c.name);
    const annotations = pod.metadata.annotations ?? {};

    expect(bindMounting.length).toBeGreaterThan(0);
    for (const name of bindMounting) {
      expect(annotations[`io.podman.annotations.label/${name}`]).toBe("disable");
    }
  });
});