// Checks a prod pod manifest before website-update.sh installs it (#1088).
//
// The manifest now ships inside the back-end image, so a bad or compromised
// image could ask the host for more than the pod gets today. This file is the
// host's own copy (copied by hand like website-update.sh, never taken from an
// image), and it refuses any manifest that breaks one of these rules:
//
//   - one Pod named "website", no annotations (podman reads some as security
//     switches, e.g. disabling SELinux labels);
//   - no host network, PID or IPC namespace;
//   - images only from ghcr.io/tim-van-oudheusden/website/;
//   - no pod-level securityContext; a container securityContext only with
//     the keys in SECURITY_KEYS, which can only take privileges away, and no
//     privileged container, privilege escalation or added capability;
//   - no volume mount with mountPropagation;
//   - host ports only on 127.0.0.1;
//   - volumes only the relative hostPath "website-data" or an emptyDir;
//   - secrets only by name from ALLOWED_SECRETS, one key at a time;
//   - a checked switch (hostNetwork, privileged, ...) only absent or exactly
//     false, and no key that differs from a checked key only in case.
//
// podman parses differently from Bun.YAML: yaml.v3 honours a tag such as
// `!!bool "true"` that Bun reads as a string, and Go's encoding/json matches
// keys case-insensitively (`HostNetwork`, `hoſtNetwork`). The last two rules
// close those gaps.
//
// Usage (website-update.sh runs it with bun from the previously running image,
// with no network): bun validate-manifest.ts <prod.yaml>. Prints one line per
// problem and exits 1 when there is any.

const POD_NAME = "website";
const IMAGE_PREFIX = "ghcr.io/tim-van-oudheusden/website/";
const DATA_HOST_PATH = "website-data";
const ALLOWED_SECRETS: readonly string[] = ["hive-widget-token"];
// Container securityContext keys that take privileges away, or are checked
// below. Any other key (seLinuxOptions, runAsUser, procMount, seccompProfile,
// ...) can hand the container more than the pod on main gets.
const SECURITY_KEYS: readonly string[] = [
  "privileged",
  "allowPrivilegeEscalation",
  "capabilities",
  "readOnlyRootFilesystem",
  "runAsNonRoot",
];
// Every key this file reads. Go's encoding/json, which podman decodes the
// manifest with, also matches a key that differs from one of these in case,
// and folds ſ, K and İ to s, k and i.
const CHECKED_KEYS: readonly string[] = [
  "kind", "metadata", "name", "annotations", "spec", "securityContext",
  "hostNetwork", "hostPID", "hostIPC", "initContainers", "containers", "image",
  "ports", "hostPort", "hostIP", "volumeMounts", "mountPropagation", "envFrom",
  "env", "valueFrom", "secretKeyRef", "volumes", "emptyDir", "hostPath", "path",
  "add", ...SECURITY_KEYS,
];

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Whether a switch is set to anything but absent or `false`, so podman may read it as on. */
function switchedOn(value: unknown): boolean {
  return value !== undefined && value !== false;
}

/** Reports every key under `value` that podman could read as a checked key this file does not see. */
function checkKeys(value: unknown, problems: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      checkKeys(item, problems);
    }

    return;
  }

  if (!isFields(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    const folded = key.toLowerCase();
    const isAscii = /^[\x20-\x7e]*$/.test(key);

    if (!isAscii || CHECKED_KEYS.some((checked) => checked !== key && checked.toLowerCase() === folded)) {
      problems.push(`key ${JSON.stringify(key)} is not allowed`);
    }

    checkKeys(child, problems);
  }
}

function checkContainer(container: unknown, problems: string[]): void {
  if (!isFields(container)) {
    problems.push("a container is not an object");

    return;
  }

  const label = typeof container["name"] === "string" ? container["name"] : "(unnamed)";
  const image = container["image"];

  if (typeof image !== "string" || !image.startsWith(IMAGE_PREFIX)) {
    problems.push(`${label}: image ${String(image)} is not from ${IMAGE_PREFIX}`);
  }

  const security = container["securityContext"];

  if (isFields(security)) {
    for (const key of Object.keys(security).filter((name) => !SECURITY_KEYS.includes(name))) {
      problems.push(`${label}: securityContext.${key} is not allowed`);
    }

    if (switchedOn(security["privileged"])) {
      problems.push(`${label}: privileged`);
    }

    if (switchedOn(security["allowPrivilegeEscalation"])) {
      problems.push(`${label}: allows privilege escalation`);
    }

    const capabilities = security["capabilities"];

    if (isFields(capabilities) && list(capabilities["add"]).length > 0) {
      problems.push(`${label}: adds capabilities`);
    }
  }

  for (const port of list(container["ports"])) {
    if (isFields(port) && port["hostPort"] !== undefined && port["hostIP"] !== "127.0.0.1") {
      problems.push(`${label}: host port ${JSON.stringify(port["hostPort"])} is not bound to 127.0.0.1`);
    }
  }

  for (const mount of list(container["volumeMounts"])) {
    if (isFields(mount) && mount["mountPropagation"] !== undefined) {
      problems.push(`${label}: volume mount ${String(mount["name"])} sets mountPropagation`);
    }
  }

  if (container["envFrom"] !== undefined) {
    problems.push(`${label}: envFrom is not allowed`);
  }

  for (const variable of list(container["env"])) {
    const valueFrom = isFields(variable) ? variable["valueFrom"] : undefined;
    const secretRef = isFields(valueFrom) ? valueFrom["secretKeyRef"] : undefined;

    if (isFields(secretRef) && !ALLOWED_SECRETS.includes(String(secretRef["name"]))) {
      problems.push(`${label}: secret ${String(secretRef["name"])} is not allowed`);
    }
  }
}

function checkVolume(volume: unknown, problems: string[]): void {
  if (!isFields(volume)) {
    problems.push("a volume is not an object");

    return;
  }

  const kinds = Object.keys(volume).filter((key) => key !== "name");
  const hostPath = volume["hostPath"];

  if (kinds.length === 1 && kinds[0] === "emptyDir") {
    return;
  }

  if (kinds.length === 1 && isFields(hostPath) && hostPath["path"] === DATA_HOST_PATH) {
    return;
  }

  problems.push(`volume ${String(volume["name"])}: only hostPath ${DATA_HOST_PATH} or emptyDir is allowed`);
}

/** Every reason the manifest may not be installed; empty when it may. */
export function validateManifest(text: string): string[] {
  let pod: unknown;

  try {
    pod = Bun.YAML.parse(text);
  } catch (error) {
    return [`not YAML: ${String(error)}`];
  }

  if (!isFields(pod) || pod["kind"] !== "Pod") {
    return ["not a single Pod manifest"];
  }

  const problems: string[] = [];

  checkKeys(pod, problems);

  const metadata = isFields(pod["metadata"]) ? pod["metadata"] : {};
  const spec = isFields(pod["spec"]) ? pod["spec"] : {};

  if (metadata["name"] !== POD_NAME) {
    problems.push(`pod name ${String(metadata["name"])} is not ${POD_NAME}`);
  }

  if (metadata["annotations"] !== undefined) {
    problems.push("annotations are not allowed");
  }

  if (spec["securityContext"] !== undefined) {
    problems.push("a pod-level securityContext is not allowed");
  }

  for (const namespace of ["hostNetwork", "hostPID", "hostIPC"]) {
    if (switchedOn(spec[namespace])) {
      problems.push(`${namespace} is not allowed`);
    }
  }

  const containers = [...list(spec["initContainers"]), ...list(spec["containers"])];

  if (containers.length === 0) {
    problems.push("no containers");
  }

  for (const container of containers) {
    checkContainer(container, problems);
  }

  for (const volume of list(spec["volumes"])) {
    checkVolume(volume, problems);
  }

  return problems;
}

/**
 * The command line website-update.sh relies on: exit 0 when the manifest at
 * args[0] may be installed, 1 with one reported line per problem when not, and
 * 2 when no path was given.
 */
export async function runCli(args: readonly string[], report: (line: string) => void): Promise<number> {
  const path = args[0];

  if (path === undefined) {
    report("usage: bun validate-manifest.ts <prod.yaml>");

    return 2;
  }

  const problems = validateManifest(await Bun.file(path).text());

  for (const problem of problems) {
    report(problem);
  }

  return problems.length === 0 ? 0 : 1;
}

if (import.meta.main) {
  process.exit(await runCli(process.argv.slice(2), console.error));
}
