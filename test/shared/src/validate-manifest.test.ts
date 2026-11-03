import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { runCli, validateManifest } from "../../../deploy/systemd/validate-manifest";

const rootPath = resolve(import.meta.dirname, "../../..");
const prodYaml = readFileSync(resolve(rootPath, "deploy/kube/prod.yaml"), "utf8");

interface Container {
  image: string;
  ports?: { containerPort: number; hostPort?: number; hostIP?: string }[];
  env?: { name: string; valueFrom?: { secretKeyRef?: { name: string } } }[];
  envFrom?: unknown[];
  securityContext?: Record<string, unknown>;
  volumeMounts?: { name: string; mountPath: string; mountPropagation?: string }[];
}

interface Pod {
  metadata: { name: string };
  spec: {
    hostNetwork?: boolean;
    hostPID?: boolean;
    hostIPC?: boolean;
    securityContext?: Record<string, unknown>;
    initContainers?: Container[];
    containers: Container[];
    volumes: { name: string; hostPath?: { path: string }; emptyDir?: object; nfs?: object }[];
  };
}

/** prod.yaml with one change applied; YAML is a superset of JSON, so the result is still valid input. */
function mutated(change: (pod: Pod) => void): string {
  const pod = Bun.YAML.parse(prodYaml) as Pod;

  change(pod);

  return JSON.stringify(pod);
}

/** prod.yaml as text with `lines` inserted after `anchor`, for YAML that JSON cannot spell (explicit tags). */
function inserted(anchor: string, lines: string): string {
  if (!prodYaml.includes(anchor)) {
    throw new Error(`prod.yaml has no ${anchor}`);
  }

  return prodYaml.replace(anchor, `${anchor}${lines}`);
}

const backEndImage = "      image: ghcr.io/tim-van-oudheusden/website/back-end:latest\n";

function backEnd(pod: Pod): Container {
  const container = pod.spec.containers.find((candidate) => candidate.image.endsWith("/back-end:latest"));

  if (container === undefined) {
    throw new Error("prod.yaml has no back-end container");
  }

  return container;
}

describe("deploy/systemd/validate-manifest.ts", () => {
  test("accepts the prod pod manifest on main", () => {
    expect(validateManifest(prodYaml)).toEqual([]);
  });

  test.each([
    ["another pod name", (pod: Pod) => {
      pod.metadata.name = "other";
    }],
    ["host networking", (pod: Pod) => {
      pod.spec.hostNetwork = true;
    }],
    ["the host PID namespace", (pod: Pod) => {
      pod.spec.hostPID = true;
    }],
    ["the host IPC namespace", (pod: Pod) => {
      pod.spec.hostIPC = true;
    }],
    ["a privileged init container", (pod: Pod) => {
      pod.spec.initContainers = [{ image: backEnd(pod).image, securityContext: { privileged: true } }];
    }],
    ["an image from another registry", (pod: Pod) => {
      backEnd(pod).image = "docker.io/library/alpine:latest";
    }],
    ["a privileged container", (pod: Pod) => {
      backEnd(pod).securityContext = { privileged: true };
    }],
    ["an added capability", (pod: Pod) => {
      backEnd(pod).securityContext = { capabilities: { add: ["SYS_ADMIN"] } };
    }],
    ["privilege escalation", (pod: Pod) => {
      backEnd(pod).securityContext = { allowPrivilegeEscalation: true };
    }],
    ["an SELinux type that turns off confinement", (pod: Pod) => {
      backEnd(pod).securityContext = { seLinuxOptions: { type: "spc_t" } };
    }],
    ["running as root", (pod: Pod) => {
      backEnd(pod).securityContext = { runAsUser: 0 };
    }],
    ["an unmasked /proc", (pod: Pod) => {
      backEnd(pod).securityContext = { procMount: "Unmasked" };
    }],
    ["no seccomp filter", (pod: Pod) => {
      backEnd(pod).securityContext = { seccompProfile: { type: "Unconfined" } };
    }],
    ["a pod-level securityContext", (pod: Pod) => {
      pod.spec.securityContext = { seLinuxOptions: { type: "spc_t" } };
    }],
    ["mount propagation from the container to the host", (pod: Pod) => {
      backEnd(pod).volumeMounts = [{ name: "views-data", mountPath: "/data", mountPropagation: "Bidirectional" }];
    }],
    ["annotations, which podman reads as security switches", (pod: Pod) => {
      Object.assign(pod.metadata, { annotations: { "io.podman.annotations.label/back-end": "disable" } });
    }],
    ["a pod without containers", (pod: Pod) => {
      pod.spec.containers = [];
    }],
    ["a container that is not an object", (pod: Pod) => {
      (pod.spec.containers as unknown[]).push("back-end");
    }],
    ["a volume that is not an object", (pod: Pod) => {
      (pod.spec.volumes as unknown[]).push("website-data");
    }],
    ["a host port on every interface", (pod: Pod) => {
      backEnd(pod).ports = [{ containerPort: 3001, hostPort: 8301 }];
    }],
    ["a host folder other than website-data", (pod: Pod) => {
      pod.spec.volumes.push({ name: "root", hostPath: { path: "/" } });
    }],
    ["an emptyDir volume that also names a host folder", (pod: Pod) => {
      pod.spec.volumes.push({ name: "scratch", emptyDir: {}, hostPath: { path: "/" } });
    }],
    ["a website-data volume that also names a network share", (pod: Pod) => {
      pod.spec.volumes.push({ name: "share", hostPath: { path: "website-data" }, nfs: { server: "nas", path: "/" } });
    }],
    ["a podman secret it was not given", (pod: Pod) => {
      backEnd(pod).env?.push({ name: "TUNNEL", valueFrom: { secretKeyRef: { name: "cloudflared-token" } } });
    }],
    ["a whole secret as environment", (pod: Pod) => {
      backEnd(pod).envFrom = [{ secretRef: { name: "hive-widget-token" } }];
    }],
  ])("rejects %s", (_label, change) => {
    expect(validateManifest(mutated(change))).not.toEqual([]);
  });

  // podman decodes with yaml.v3, which honours an explicit !!bool tag on a quoted scalar; Bun reads a string (#1118).
  test.each([
    ["host networking", inserted("spec:\n", "  hostNetwork: !!bool \"true\"\n")],
    ["the host PID namespace", inserted("spec:\n", "  hostPID: !!bool \"true\"\n")],
    ["the host IPC namespace", inserted("spec:\n", "  hostIPC: !!bool \"true\"\n")],
    ["a privileged container", inserted(backEndImage, "      securityContext:\n        privileged: !!bool \"true\"\n")],
    [
      "privilege escalation",
      inserted(backEndImage, "      securityContext:\n        allowPrivilegeEscalation: !!bool \"true\"\n"),
    ],
  ])("rejects %s tagged !!bool on a quoted scalar", (_label, text) => {
    expect(validateManifest(text)).not.toEqual([]);
  });

  // podman decodes with Go's encoding/json, which matches keys to fields ignoring case (#1118).
  test.each([
    ["HostNetwork", (pod: Pod) => {
      Object.assign(pod.spec, { HostNetwork: true });
    }],
    ["hostpid", (pod: Pod) => {
      Object.assign(pod.spec, { hostpid: true });
    }],
    ["SecurityContext", (pod: Pod) => {
      Object.assign(backEnd(pod), { SecurityContext: { privileged: true } });
    }],
    ["Annotations", (pod: Pod) => {
      Object.assign(pod.metadata, { Annotations: { "io.podman.annotations.label/back-end": "disable" } });
    }],
    ["EnvFrom", (pod: Pod) => {
      Object.assign(backEnd(pod), { EnvFrom: [{ secretRef: { name: "cloudflared-token" } }] });
    }],
    ["HostIP after hostIP", (pod: Pod) => {
      Object.assign(backEnd(pod).ports?.[0] ?? {}, { HostIP: "0.0.0.0" });
    }],
    ["MountPropagation", (pod: Pod) => {
      Object.assign(backEnd(pod).volumeMounts?.[0] ?? {}, { MountPropagation: "Bidirectional" });
    }],
    ["SecretKeyRef", (pod: Pod) => {
      (backEnd(pod).env as unknown[]).push({ name: "TUNNEL", valueFrom: { SecretKeyRef: { name: "cloudflared-token" } } });
    }],
  ])("rejects a checked key spelled %s", (_label, change) => {
    expect(validateManifest(mutated(change))).not.toEqual([]);
  });

  test("rejects a key that is not ASCII, which Go may fold onto a checked one", () => {
    expect(validateManifest(mutated((pod) => {
      // "hoſtNetwork", with U+017F LATIN SMALL LETTER LONG S, which Go folds to "s".
      Object.assign(pod.spec, Object.fromEntries([["ho\u017FtNetwork", true]]));
    }))).not.toEqual([]);
  });

  test("rejects text that is not a pod manifest", () => {
    expect(validateManifest("just: [unbalanced")).not.toEqual([]);
    expect(validateManifest("kind: Deployment\nmetadata:\n  name: website\n")).not.toEqual([]);
  });

  test("rejects another kind even when its spec would pass as a pod", () => {
    expect(validateManifest(mutated((pod) => Object.assign(pod, { kind: "Deployment" })))).toEqual([
      "not a single Pod manifest",
    ]);
  });

  test("accepts an emptyDir volume, which grants nothing on the host", () => {
    expect(validateManifest(mutated((pod) => {
      pod.spec.volumes.push(Object.assign({ name: "scratch" }, { emptyDir: {} }));
    }))).toEqual([]);
  });

  test("accepts a container securityContext that only takes privileges away", () => {
    expect(validateManifest(mutated((pod) => {
      backEnd(pod).securityContext = {
        privileged: false,
        allowPrivilegeEscalation: false,
        capabilities: { drop: ["ALL"] },
        readOnlyRootFilesystem: true,
        runAsNonRoot: true,
      };
    }))).toEqual([]);
  });
});

describe("validate-manifest.ts as website-update.sh runs it", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "validate-manifest-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** Exit code and reported lines for the CLI run on a manifest with `content`. */
  async function runOn(content: string): Promise<{ status: number; lines: string[] }> {
    const lines: string[] = [];
    const path = join(dir, "prod.yaml");

    writeFileSync(path, content);

    const status = await runCli([path], (line) => lines.push(line));

    return { status, lines };
  }

  test("exits 0 and reports nothing for main's manifest", async () => {
    expect(await runOn(prodYaml)).toEqual({ status: 0, lines: [] });
  });

  test("exits 1 and reports each reason for a manifest it refuses", async () => {
    const { status, lines } = await runOn(mutated((pod) => {
      pod.spec.hostNetwork = true;
      pod.metadata.name = "other";
    }));

    expect(status).toBe(1);
    expect(lines).toHaveLength(2);
    expect(lines.join("\n")).toContain("hostNetwork");
  });

  test("exits 2 with usage when no manifest is given", async () => {
    const lines: string[] = [];

    expect(await runCli([], (line) => lines.push(line))).toBe(2);
    expect(lines[0]).toContain("usage");
  });
});
