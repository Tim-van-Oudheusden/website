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
//   - a list field (containers, volumes, ports, env, ...) only absent or a
//     list, so no item is skipped unseen (#1117);
//   - a checked switch (hostNetwork, privileged, ...) only absent or exactly
//     false;
//   - no key, at any depth, outside CHECKED_KEYS and INERT_KEYS.
//
// podman parses differently from Bun.YAML: yaml.v3 honours a tag such as
// `!!bool "true"` that Bun reads as a string, and a key that Bun reads as
// something else (`!!binary` on a key, `? key` in a flow mapping), and Go's
// encoding/json matches keys case-insensitively (`HostNetwork`, `hoſtNetwork`).
// The last two rules close those gaps, the key list by refusing whatever it
// cannot name rather than guessing what podman would read there (#1210).
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
const SECURITY_KEYS = [
  "privileged",
  "allowPrivilegeEscalation",
  "capabilities",
  "readOnlyRootFilesystem",
  "runAsNonRoot",
] as const;
// Every key this file reads. field() takes only these keys, so a read of a key
// missing here fails the typecheck instead of leaving it refused by checkKeys.
const CHECKED_KEYS = [
  "kind", "metadata", "name", "annotations", "spec", "securityContext",
  "hostNetwork", "hostPID", "hostIPC", "initContainers", "containers", "image",
  "ports", "hostPort", "hostIP", "volumeMounts", "mountPropagation", "envFrom",
  "env", "valueFrom", "secretKeyRef", "volumes", "emptyDir", "hostPath", "path",
  "add", ...SECURITY_KEYS,
] as const;

// Keys the prod manifest needs that this file has no rule for, because none of
// them can ask the host for anything. A new field in prod.yaml goes here only
// after that has been checked: until then the manifest is refused and the
// running one stays, and the host's hand-copied file needs the change too.
const INERT_KEYS = [
  "apiVersion", "labels", "app", "restartPolicy", "imagePullPolicy", "value",
  "containerPort", "livenessProbe", "exec", "command", "initialDelaySeconds",
  "periodSeconds", "timeoutSeconds", "failureThreshold", "mountPath", "type",
  "key", "optional", "drop",
] as const;

type CheckedKey = (typeof CHECKED_KEYS)[number];
type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The only way this file reads a manifest key, so every key read is in CHECKED_KEYS. */
function field(fields: Fields, key: CheckedKey): unknown {
  return fields[key];
}

/**
 * The items of a list field. A value that is present but not a list is
 * reported under `where`, not skipped: Bun would see no items in it, and only
 * podman's decoder would stand between it and the pod.
 */
function list(value: unknown, where: string, problems: string[]): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (value !== undefined) {
    problems.push(`${where} is not a list`);
  }

  return [];
}

/** Whether a switch is set to anything but absent or `false`, so podman may read it as on. */
function switchedOn(value: unknown): boolean {
  return value !== undefined && value !== false;
}

/** Reports every key under `value` that is not on the two key lists. */
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
    if (![...CHECKED_KEYS, ...INERT_KEYS].some((allowed) => allowed === key)) {
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

  const name = field(container, "name");
  const label = typeof name === "string" ? name : "(unnamed)";
  const image = field(container, "image");

  if (typeof image !== "string" || !image.startsWith(IMAGE_PREFIX)) {
    problems.push(`${label}: image ${String(image)} is not from ${IMAGE_PREFIX}`);
  }

  const security = field(container, "securityContext");

  if (isFields(security)) {
    for (const key of Object.keys(security).filter((name) => !SECURITY_KEYS.some((allowed) => allowed === name))) {
      problems.push(`${label}: securityContext.${key} is not allowed`);
    }

    if (switchedOn(field(security, "privileged"))) {
      problems.push(`${label}: privileged`);
    }

    if (switchedOn(field(security, "allowPrivilegeEscalation"))) {
      problems.push(`${label}: allows privilege escalation`);
    }

    const capabilities = field(security, "capabilities");

    if (isFields(capabilities) && list(field(capabilities, "add"), `${label}: capabilities.add`, problems).length > 0) {
      problems.push(`${label}: adds capabilities`);
    }
  }

  for (const port of list(field(container, "ports"), `${label}: ports`, problems)) {
    if (isFields(port) && field(port, "hostPort") !== undefined && field(port, "hostIP") !== "127.0.0.1") {
      problems.push(`${label}: host port ${JSON.stringify(field(port, "hostPort"))} is not bound to 127.0.0.1`);
    }
  }

  for (const mount of list(field(container, "volumeMounts"), `${label}: volumeMounts`, problems)) {
    if (isFields(mount) && field(mount, "mountPropagation") !== undefined) {
      problems.push(`${label}: volume mount ${String(field(mount, "name"))} sets mountPropagation`);
    }
  }

  if (field(container, "envFrom") !== undefined) {
    problems.push(`${label}: envFrom is not allowed`);
  }

  for (const variable of list(field(container, "env"), `${label}: env`, problems)) {
    const valueFrom = isFields(variable) ? field(variable, "valueFrom") : undefined;
    const secretRef = isFields(valueFrom) ? field(valueFrom, "secretKeyRef") : undefined;

    if (isFields(secretRef) && !ALLOWED_SECRETS.includes(String(field(secretRef, "name")))) {
      problems.push(`${label}: secret ${String(field(secretRef, "name"))} is not allowed`);
    }
  }
}

function checkVolume(volume: unknown, problems: string[]): void {
  if (!isFields(volume)) {
    problems.push("a volume is not an object");

    return;
  }

  const kinds = Object.keys(volume).filter((key) => key !== "name");
  const hostPath = field(volume, "hostPath");

  if (kinds.length === 1 && kinds[0] === "emptyDir") {
    return;
  }

  if (kinds.length === 1 && isFields(hostPath) && field(hostPath, "path") === DATA_HOST_PATH) {
    return;
  }

  problems.push(`volume ${String(field(volume, "name"))}: only hostPath ${DATA_HOST_PATH} or emptyDir is allowed`);
}

/** Every reason the manifest may not be installed; empty when it may. */
export function validateManifest(text: string): string[] {
  let pod: unknown;

  try {
    pod = Bun.YAML.parse(text);
  } catch (error) {
    return [`not YAML: ${String(error)}`];
  }

  if (!isFields(pod) || field(pod, "kind") !== "Pod") {
    return ["not a single Pod manifest"];
  }

  const problems: string[] = [];

  checkKeys(pod, problems);

  const podMetadata = field(pod, "metadata");
  const podSpec = field(pod, "spec");
  const metadata = isFields(podMetadata) ? podMetadata : {};
  const spec = isFields(podSpec) ? podSpec : {};

  if (field(metadata, "name") !== POD_NAME) {
    problems.push(`pod name ${String(field(metadata, "name"))} is not ${POD_NAME}`);
  }

  if (field(metadata, "annotations") !== undefined) {
    problems.push("annotations are not allowed");
  }

  if (field(spec, "securityContext") !== undefined) {
    problems.push("a pod-level securityContext is not allowed");
  }

  for (const namespace of ["hostNetwork", "hostPID", "hostIPC"] as const) {
    if (switchedOn(field(spec, namespace))) {
      problems.push(`${namespace} is not allowed`);
    }
  }

  const containers = [
    ...list(field(spec, "initContainers"), "initContainers", problems),
    ...list(field(spec, "containers"), "containers", problems),
  ];

  if (containers.length === 0) {
    problems.push("no containers");
  }

  for (const container of containers) {
    checkContainer(container, problems);
  }

  for (const volume of list(field(spec, "volumes"), "volumes", problems)) {
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
