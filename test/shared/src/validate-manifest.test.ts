import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { validateManifest } from "../../../deploy/systemd/validate-manifest";

const rootPath = resolve(import.meta.dirname, "../../..");
const prodYaml = readFileSync(resolve(rootPath, "deploy/kube/prod.yaml"), "utf8");

interface Container {
  image: string;
  ports?: { containerPort: number; hostPort?: number; hostIP?: string }[];
  env?: { name: string; valueFrom?: { secretKeyRef?: { name: string } } }[];
  envFrom?: unknown[];
  securityContext?: Record<string, unknown>;
}

interface Pod {
  metadata: { name: string };
  spec: {
    hostNetwork?: boolean;
    containers: Container[];
    volumes: { name: string; hostPath?: { path: string } }[];
  };
}

/** prod.yaml with one change applied; YAML is a superset of JSON, so the result is still valid input. */
function mutated(change: (pod: Pod) => void): string {
  const pod = Bun.YAML.parse(prodYaml) as Pod;

  change(pod);

  return JSON.stringify(pod);
}

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
    ["an image from another registry", (pod: Pod) => {
      backEnd(pod).image = "docker.io/library/alpine:latest";
    }],
    ["a privileged container", (pod: Pod) => {
      backEnd(pod).securityContext = { privileged: true };
    }],
    ["an added capability", (pod: Pod) => {
      backEnd(pod).securityContext = { capabilities: { add: ["SYS_ADMIN"] } };
    }],
    ["a host port on every interface", (pod: Pod) => {
      backEnd(pod).ports = [{ containerPort: 3001, hostPort: 8301 }];
    }],
    ["a host folder other than website-data", (pod: Pod) => {
      pod.spec.volumes.push({ name: "root", hostPath: { path: "/" } });
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

  test("rejects text that is not a pod manifest", () => {
    expect(validateManifest("just: [unbalanced")).not.toEqual([]);
    expect(validateManifest("kind: Deployment\nmetadata:\n  name: website\n")).not.toEqual([]);
  });
});
