// Checks a prod pod manifest before website-update.sh installs it (#1088).
//
// The manifest now ships inside the back-end image, so a bad or compromised
// image could ask the host for more than the pod gets today. This file is the
// host's own copy (copied by hand like website-update.sh, never taken from an
// image), and it refuses anything outside the shape the pod has on main:
//
//   - one Pod named "website", no annotations (podman reads some as security
//     switches, e.g. disabling SELinux labels);
//   - no host network, PID or IPC namespace;
//   - images only from ghcr.io/tim-van-oudheusden/website/;
//   - no privileged container, privilege escalation or added capability;
//   - host ports only on 127.0.0.1;
//   - volumes only the relative hostPath "website-data" or an emptyDir;
//   - secrets only by name from ALLOWED_SECRETS, one key at a time.
//
// Usage (website-update.sh runs it with bun from the previously running image,
// with no network): bun validate-manifest.ts <prod.yaml>. Prints one line per
// problem and exits 1 when there is any.

const POD_NAME = "website";
const IMAGE_PREFIX = "ghcr.io/tim-van-oudheusden/website/";
const DATA_HOST_PATH = "website-data";
const ALLOWED_SECRETS: readonly string[] = ["hive-widget-token"];

type Fields = Record<string, unknown>;

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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
    if (security["privileged"] === true) {
      problems.push(`${label}: privileged`);
    }

    if (security["allowPrivilegeEscalation"] === true) {
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
  const metadata = isFields(pod["metadata"]) ? pod["metadata"] : {};
  const spec = isFields(pod["spec"]) ? pod["spec"] : {};

  if (metadata["name"] !== POD_NAME) {
    problems.push(`pod name ${String(metadata["name"])} is not ${POD_NAME}`);
  }

  if (metadata["annotations"] !== undefined) {
    problems.push("annotations are not allowed");
  }

  for (const namespace of ["hostNetwork", "hostPID", "hostIPC"]) {
    if (spec[namespace] === true) {
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
