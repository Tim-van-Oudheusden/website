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
//   - no key that is not ASCII, or that spells a key read here in another
//     case (#1118).
//
// podman reads the manifest differently from Bun.YAML (#1118): yaml.v3 honours
// explicit tags (`hostNetwork: !!bool "true"` is true, Bun reads the string),
// and Go's encoding/json matches keys to fields ignoring case (`HostNetwork`
// sets hostNetwork; it also folds some non-ASCII letters such as U+017F onto
// ASCII). So a host-namespace or privilege switch passes only when absent or
// exactly false, and the key rules above leave podman nothing to read that
// this check did not.
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

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Anything but absent or false: podman may read a tagged string such as `!!bool "true"` as true. */
function granted(value: unknown): boolean {
  return value !== undefined && value !== false;
}

/**
 * fields[key], reporting every other key in fields that is the same key in
 * another case: podman would read that one as key too.
 */
function field(fields: Fields, key: string, problems: string[]): unknown {
  for (const other of Object.keys(fields)) {
    if (other !== key && other.toLowerCase() === key.toLowerCase()) {
      problems.push(`key ${other} is not allowed, only ${key}`);
    }
  }

  return fields[key];
}

/** Every key below value that is not printable ASCII. */
function nonAsciiKeys(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(nonAsciiKeys);
  }

  if (!isFields(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => [
    ...(/^[\x20-\x7E]*$/.test(key) ? [] : [key]),
    ...nonAsciiKeys(child),
  ]);
}

function checkContainer(container: unknown, problems: string[]): void {
  if (!isFields(container)) {
    problems.push("a container is not an object");

    return;
  }

  const label = typeof container["name"] === "string" ? container["name"] : "(unnamed)";
  const image = field(container, "image", problems);

  if (typeof image !== "string" || !image.startsWith(IMAGE_PREFIX)) {
    problems.push(`${label}: image ${String(image)} is not from ${IMAGE_PREFIX}`);
  }

  const security = field(container, "securityContext", problems);

  if (isFields(security)) {
    for (const key of Object.keys(security).filter((name) => !SECURITY_KEYS.includes(name))) {
      problems.push(`${label}: securityContext.${key} is not allowed`);
    }

    if (granted(field(security, "privileged", problems))) {
      problems.push(`${label}: privileged`);
    }

    if (granted(field(security, "allowPrivilegeEscalation", problems))) {
      problems.push(`${label}: allows privilege escalation`);
    }

    const capabilities = field(security, "capabilities", problems);

    if (isFields(capabilities) && list(field(capabilities, "add", problems)).length > 0) {
      problems.push(`${label}: adds capabilities`);
    }
  }

  for (const port of list(field(container, "ports", problems))) {
    if (!isFields(port)) {
      continue;
    }

    const hostPort = field(port, "hostPort", problems);

    if (hostPort !== undefined && field(port, "hostIP", problems) !== "127.0.0.1") {
      problems.push(`${label}: host port ${JSON.stringify(hostPort)} is not bound to 127.0.0.1`);
    }
  }

  for (const mount of list(field(container, "volumeMounts", problems))) {
    if (isFields(mount) && field(mount, "mountPropagation", problems) !== undefined) {
      problems.push(`${label}: volume mount ${String(mount["name"])} sets mountPropagation`);
    }
  }

  if (field(container, "envFrom", problems) !== undefined) {
    problems.push(`${label}: envFrom is not allowed`);
  }

  for (const variable of list(field(container, "env", problems))) {
    const valueFrom = isFields(variable) ? field(variable, "valueFrom", problems) : undefined;
    const secretRef = isFields(valueFrom) ? field(valueFrom, "secretKeyRef", problems) : undefined;

    if (!isFields(secretRef)) {
      continue;
    }

    const secret = field(secretRef, "name", problems);

    if (!ALLOWED_SECRETS.includes(String(secret))) {
      problems.push(`${label}: secret ${String(secret)} is not allowed`);
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

  if (kinds.length === 1 && isFields(hostPath) && field(hostPath, "path", problems) === DATA_HOST_PATH) {
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

  const problems: string[] = [];

  if (!isFields(pod) || field(pod, "kind", problems) !== "Pod") {
    return ["not a single Pod manifest"];
  }

  for (const key of nonAsciiKeys(pod)) {
    problems.push(`key ${JSON.stringify(key)} is not ASCII`);
  }

  const metadataField = field(pod, "metadata", problems);
  const specField = field(pod, "spec", problems);
  const metadata = isFields(metadataField) ? metadataField : {};
  const spec = isFields(specField) ? specField : {};
  const name = field(metadata, "name", problems);

  if (name !== POD_NAME) {
    problems.push(`pod name ${String(name)} is not ${POD_NAME}`);
  }

  if (field(metadata, "annotations", problems) !== undefined) {
    problems.push("annotations are not allowed");
  }

  if (field(spec, "securityContext", problems) !== undefined) {
    problems.push("a pod-level securityContext is not allowed");
  }

  for (const namespace of ["hostNetwork", "hostPID", "hostIPC"]) {
    if (granted(field(spec, namespace, problems))) {
      problems.push(`${namespace} is not allowed`);
    }
  }

  const containers = [...list(field(spec, "initContainers", problems)), ...list(field(spec, "containers", problems))];

  if (containers.length === 0) {
    problems.push("no containers");
  }

  for (const container of containers) {
    checkContainer(container, problems);
  }

  for (const volume of list(field(spec, "volumes", problems))) {
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
