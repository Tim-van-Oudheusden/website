import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "deploy/systemd/website-update.sh");

const FRONT = "ghcr.io/tim-van-oudheusden/website/front-end";
const BACK = "ghcr.io/tim-van-oudheusden/website/back-end";
const FRONT_HEALTH = "http://127.0.0.1:8300/health";
const BACK_HEALTH = "http://127.0.0.1:8301/health";

let stubDir: string;
let imageDir: string;
let registryDir: string;
let callLog: string;

function writeStub(name: string, body: string): void {
  const stubPath = join(stubDir, name);

  writeFileSync(stubPath, `#!/usr/bin/env bash\necho "${name} $*" >> "${callLog}"\n${body}\n`);
  chmodSync(stubPath, 0o755);
}

// One file per image ref, holding its digest; "/" and ":" are flattened into the file name.
function refFile(dir: string, ref: string): string {
  return join(dir, ref.replaceAll(/[/:]/g, "_"));
}

/** Seed the local image store, as if `ref` had been pulled at `digest` earlier. */
function setLocal(ref: string, digest: string): void {
  writeFileSync(refFile(imageDir, ref), digest);
}

/** What `podman pull ref` will fetch from the registry. */
function setRegistry(ref: string, digest: string): void {
  writeFileSync(refFile(registryDir, ref), digest);
}

function localDigest(ref: string): string | null {
  const file = refFile(imageDir, ref);

  return existsSync(file) ? readFileSync(file, "utf8") : null;
}

interface ScriptRun {
  status: number | null;
  calls: string[];
  stderr: string;
  stdout: string;
}

/**
 * `healthy`: the /health URLs that answer 200. `unstartable`: image digests the pod
 * cannot start on, so replaying it while one is on :latest fails like `kube play`'s
 * "failed to start N containers".
 */
function runScript(healthy: readonly string[], unstartable: readonly string[] = []): ScriptRun {
  writeFileSync(callLog, "");

  const result = spawnSync("bash", [scriptPath], {
    cwd: rootPath,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      STUB_HEALTHY: healthy.join(" "),
      STUB_UNSTARTABLE: unstartable.join(" "),
      XDG_STATE_HOME: join(stubDir, "state"),
    },
  });
  const calls = readFileSync(callLog, "utf8").trim().split("\n").filter((call) => call !== "");

  return { status: result.status, calls, stderr: result.stderr, stdout: result.stdout };
}

function restarts(calls: readonly string[]): number {
  return calls.filter((call) => call === "systemctl --user restart podman-kube@website.service").length;
}

beforeEach(() => {
  stubDir = mkdtempSync(join(tmpdir(), "website-update-script-"));
  imageDir = join(stubDir, "images");
  registryDir = join(stubDir, "registry");
  callLog = join(stubDir, "calls.log");
  mkdirSync(imageDir);
  mkdirSync(registryDir);

  // A local image store (imageDir) and a registry (registryDir), one digest per ref.
  writeStub(
    "podman",
    [
      `ref_file() { echo "$1/\${2//[\\/:]/_}"; }`,
      `case "$1" in`,
      `  image) f="$(ref_file "${imageDir}" "$5")"; [ -f "$f" ] && cat "$f" && exit 0; exit 125;;`,
      `  tag) cp "$(ref_file "${imageDir}" "$2")" "$(ref_file "${imageDir}" "$3")";;`,
      `  pull) cp "$(ref_file "${registryDir}" "$2")" "$(ref_file "${imageDir}" "$2")";;`,
      `  *) exit 2;;`,
      `esac`,
    ].join("\n"),
  );

  // Answers 200 only for URLs listed in STUB_HEALTHY; anything else fails like `curl -f` on a refused port.
  writeStub("curl", `for url in $STUB_HEALTHY; do [ "$url" = "\${@: -1}" ] && exit 0; done; exit 7`);

  // Fails the replay while an unstartable digest is on :latest, as `kube play` does when a container won't start.
  writeStub(
    "systemctl",
    `for digest in $STUB_UNSTARTABLE; do grep -qxF "$digest" "${imageDir}"/*_latest && exit 1; done; exit 0`,
  );

  writeStub("sleep", "exit 0");
});

afterEach(() => {
  rmSync(stubDir, { recursive: true, force: true });
});

describe("deploy/systemd/website-update.sh", () => {
  test("pulls every image the prod pod manifest runs", () => {
    const prodImages = [
      ...readFileSync(resolve(rootPath, "deploy/kube/prod.yaml"), "utf8").matchAll(/^\s*image:\s*(\S+)\s*$/gm),
    ].map((match) => match[1] ?? "");

    expect(prodImages.length).toBeGreaterThan(0);

    for (const image of prodImages) {
      setLocal(image, "sha256:a");
      setRegistry(image, "sha256:a");
    }

    const { status, calls } = runScript([FRONT_HEALTH, BACK_HEALTH]);

    expect(status).toBe(0);

    for (const image of prodImages) {
      expect(calls).toContain(`podman pull ${image}`);
    }
  });

  test("leaves the pod alone when neither image's digest changed", () => {
    setLocal(`${FRONT}:latest`, "sha256:front-a");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-a");
    setRegistry(`${BACK}:latest`, "sha256:back-a");

    const { status, calls, stdout } = runScript([FRONT_HEALTH, BACK_HEALTH]);

    expect(status).toBe(0);
    expect(stdout).toContain("images unchanged; skipping pod restart");
    expect(restarts(calls)).toBe(0);
    expect(calls.some((call) => call.startsWith("curl "))).toBe(false);
  });

  test("replays the pod once and keeps the new image when both containers answer /health", () => {
    setLocal(`${FRONT}:latest`, "sha256:front-a");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-b");
    setRegistry(`${BACK}:latest`, "sha256:back-a");

    const { status, calls, stdout } = runScript([FRONT_HEALTH, BACK_HEALTH]);

    expect(status).toBe(0);
    expect(stdout).toContain("image changed: front-end:latest sha256:front-a -> sha256:front-b");
    expect(restarts(calls)).toBe(1);
    expect(localDigest(`${FRONT}:latest`)).toBe("sha256:front-b");
    expect(localDigest(`${FRONT}:rollback`)).toBe("sha256:front-a");
  });

  test("records the rollback reference before the pull overwrites :latest", () => {
    setLocal(`${FRONT}:latest`, "sha256:front-a");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-b");
    setRegistry(`${BACK}:latest`, "sha256:back-b");

    const { calls } = runScript([FRONT_HEALTH, BACK_HEALTH]);

    for (const ref of [FRONT, BACK]) {
      const tagAt = calls.indexOf(`podman tag ${ref}:latest ${ref}:rollback`);
      const pullAt = calls.indexOf(`podman pull ${ref}:latest`);

      expect(tagAt, ref).toBeGreaterThanOrEqual(0);
      expect(tagAt, ref).toBeLessThan(pullAt);
    }
  });

  test("rolls back only the image that changed, replays again and exits non-zero when the front-end fails /health", () => {
    setLocal(`${FRONT}:latest`, "sha256:front-a");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-b");
    setRegistry(`${BACK}:latest`, "sha256:back-a");

    const { status, calls } = runScript([BACK_HEALTH]);

    expect(status).toBe(1);
    expect(restarts(calls)).toBe(2);
    expect(localDigest(`${FRONT}:latest`)).toBe("sha256:front-a");
    expect(localDigest(`${BACK}:latest`)).toBe("sha256:back-a");
    expect(calls).not.toContain(`podman tag ${BACK}:rollback ${BACK}:latest`);
  });

  test("rolls back the back-end when it is the container failing /health", () => {
    setLocal(`${FRONT}:latest`, "sha256:front-a");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-a");
    setRegistry(`${BACK}:latest`, "sha256:back-b");

    const { status, calls } = runScript([FRONT_HEALTH]);

    expect(status).toBe(1);
    expect(localDigest(`${BACK}:latest`)).toBe("sha256:back-a");
    expect(calls).not.toContain(`podman tag ${FRONT}:rollback ${FRONT}:latest`);
  });

  test("rolls back both images when both changed and the update is unhealthy", () => {
    setLocal(`${FRONT}:latest`, "sha256:front-a");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-b");
    setRegistry(`${BACK}:latest`, "sha256:back-b");

    const { status } = runScript([]);

    expect(status).toBe(1);
    expect(localDigest(`${FRONT}:latest`)).toBe("sha256:front-a");
    expect(localDigest(`${BACK}:latest`)).toBe("sha256:back-a");
  });

  test("bounds the health wait at ten polls per endpoint instead of waiting forever", () => {
    setLocal(`${FRONT}:latest`, "sha256:front-a");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-b");
    setRegistry(`${BACK}:latest`, "sha256:back-a");

    const { calls } = runScript([]);

    // The front-end check fails first, so the back-end endpoint is never polled.
    expect(calls.filter((call) => call.startsWith("curl ") && call.endsWith(FRONT_HEALTH))).toHaveLength(10);
    expect(calls.filter((call) => call.startsWith("curl ") && call.endsWith(BACK_HEALTH))).toHaveLength(0);
  });

  test("on a first deploy with no local image, makes no rollback reference and still fails loudly", () => {
    setRegistry(`${FRONT}:latest`, "sha256:front-b");
    setRegistry(`${BACK}:latest`, "sha256:back-b");

    const { status, calls } = runScript([]);

    expect(status).toBe(1);
    expect(calls.some((call) => call.startsWith("podman tag "))).toBe(false);
    expect(localDigest(`${FRONT}:rollback`)).toBeNull();
    expect(localDigest(`${FRONT}:latest`)).toBe("sha256:front-b");
  });

  test("with no local image to return to, holds a rejected digest without tagging a rollback reference", () => {
    const stateDir = join(stubDir, "state", "website-update");

    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "rejected-front-end"), "sha256:front-bad\n");
    setRegistry(`${FRONT}:latest`, "sha256:front-bad");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${BACK}:latest`, "sha256:back-a");

    const { status, calls, stderr } = runScript([FRONT_HEALTH, BACK_HEALTH]);

    expect(status).toBe(1);
    expect(calls.filter((call) => call.startsWith(`podman tag ${FRONT}`))).toHaveLength(0);
    expect(restarts(calls)).toBe(0);
    expect(stderr).toContain("still rejected: front-end:latest sha256:front-bad");
  });

  test("with no local image to hold a rejected digest back, skips the replay instead of rejecting the other image", () => {
    const stateDir = join(stubDir, "state", "website-update");

    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "rejected-front-end"), "sha256:front-bad\n");
    setRegistry(`${FRONT}:latest`, "sha256:front-bad");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${BACK}:latest`, "sha256:back-b");

    const { status, calls, stderr } = runScript([BACK_HEALTH]);

    expect(status).toBe(1);
    expect(restarts(calls)).toBe(0);
    expect(stderr).toContain("no previously running front-end image to hold back sha256:front-bad");
    expect(existsSync(join(stateDir, "rejected-back-end"))).toBe(false);
    expect(localDigest(`${BACK}:latest`)).toBe("sha256:back-a");

    // :latest stayed on the back-end the pod still runs, so a fixed front-end deploys back-b with it.
    setRegistry(`${FRONT}:latest`, "sha256:front-fixed");

    const next = runScript([FRONT_HEALTH, BACK_HEALTH]);

    expect(next.status).toBe(0);
    expect(restarts(next.calls)).toBe(1);
    expect(localDigest(`${BACK}:latest`)).toBe("sha256:back-b");
  });

  test("keeps skipping the replay on later ticks, once the unheld rejected digest is the local image", () => {
    const stateDir = join(stubDir, "state", "website-update");

    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "rejected-front-end"), "sha256:front-bad\n");
    setRegistry(`${FRONT}:latest`, "sha256:front-bad");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${BACK}:latest`, "sha256:back-b");

    expect(runScript([BACK_HEALTH]).status).toBe(1);
    // The first tick pulled the rejected front-end, so this one finds it as the local :latest.
    expect(localDigest(`${FRONT}:latest`)).toBe("sha256:front-bad");

    const { status, calls, stderr } = runScript([BACK_HEALTH]);

    expect(status).toBe(1);
    expect(restarts(calls)).toBe(0);
    expect(stderr).toContain("no previously running front-end image to hold back sha256:front-bad");
    expect(existsSync(join(stateDir, "rejected-back-end"))).toBe(false);
    expect(localDigest(`${BACK}:latest`)).toBe("sha256:back-a");
  });

  test("skips the replay without tagging the other image back when the image store held neither image", () => {
    const stateDir = join(stubDir, "state", "website-update");

    mkdirSync(stateDir, { recursive: true });
    writeFileSync(join(stateDir, "rejected-front-end"), "sha256:front-bad\n");
    setRegistry(`${FRONT}:latest`, "sha256:front-bad");
    setRegistry(`${BACK}:latest`, "sha256:back-b");
    // Left behind by an old deploy; :latest was removed, so the pod is not running it.
    setLocal(`${BACK}:rollback`, "sha256:back-old");

    const { status, calls, stderr } = runScript([BACK_HEALTH]);

    expect(status).toBe(1);
    expect(restarts(calls)).toBe(0);
    expect(calls.some((call) => call.startsWith("podman tag "))).toBe(false);
    expect(stderr).toContain("skipping pod restart: a rejected image has nothing to roll back to");
    expect(localDigest(`${BACK}:latest`)).toBe("sha256:back-b");
  });

  test("rolls back and exits non-zero when the pod cannot even be replayed on the new image", () => {
    setLocal(`${FRONT}:latest`, "sha256:front-a");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-unstartable");
    setRegistry(`${BACK}:latest`, "sha256:back-a");

    const { status, calls, stderr } = runScript([FRONT_HEALTH, BACK_HEALTH], ["sha256:front-unstartable"]);

    expect(status).toBe(1);
    expect(restarts(calls)).toBe(2);
    expect(stderr).toContain("update FAILED");
    expect(stderr).toContain("rejected: front-end:latest sha256:front-unstartable");
    expect(localDigest(`${FRONT}:latest`)).toBe("sha256:front-a");
    expect(calls.some((call) => call.startsWith("curl "))).toBe(false);
  });

  test("names the new digest and (none) for the old one when an image had no local :latest", () => {
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-b");
    setRegistry(`${BACK}:latest`, "sha256:back-a");

    const { status, stdout } = runScript([FRONT_HEALTH, BACK_HEALTH]);

    expect(status).toBe(0);
    expect(stdout).toContain("image changed: front-end:latest (none) -> sha256:front-b");
  });

  test("after a failed replay, the next tick holds the image back and keeps failing loudly", () => {
    setLocal(`${FRONT}:latest`, "sha256:front-a");
    setLocal(`${BACK}:latest`, "sha256:back-a");
    setRegistry(`${FRONT}:latest`, "sha256:front-unstartable");
    setRegistry(`${BACK}:latest`, "sha256:back-a");
    runScript([FRONT_HEALTH, BACK_HEALTH], ["sha256:front-unstartable"]);

    const { status, calls, stderr } = runScript([FRONT_HEALTH, BACK_HEALTH], ["sha256:front-unstartable"]);

    expect(status).not.toBe(0);
    expect(restarts(calls)).toBe(0);
    expect(stderr).toContain("still rejected: front-end:latest sha256:front-unstartable");
  });

  describe("after a rollback, remembers the rejected digest (#811)", () => {
    beforeEach(() => {
      setLocal(`${FRONT}:latest`, "sha256:front-a");
      setLocal(`${BACK}:latest`, "sha256:back-a");
      setRegistry(`${FRONT}:latest`, "sha256:front-bad");
      setRegistry(`${BACK}:latest`, "sha256:back-a");

      expect(runScript([BACK_HEALTH]).status).toBe(1);
    });

    test("does not replay the same bad image again on the next tick, and keeps failing loudly", () => {
      const { status, calls, stderr } = runScript([BACK_HEALTH]);

      expect(status).not.toBe(0);
      expect(restarts(calls)).toBe(0);
      expect(calls.some((call) => call.startsWith("curl "))).toBe(false);
      expect(stderr).toContain("still rejected: front-end:latest sha256:front-bad");
      expect(localDigest(`${FRONT}:latest`)).toBe("sha256:front-a");
    });

    test("deploys a newly pushed digest of the rejected image", () => {
      setRegistry(`${FRONT}:latest`, "sha256:front-fixed");

      const { status, calls } = runScript([FRONT_HEALTH, BACK_HEALTH]);

      expect(status).toBe(0);
      expect(restarts(calls)).toBe(1);
      expect(localDigest(`${FRONT}:latest`)).toBe("sha256:front-fixed");
    });

    test("still deploys a new digest of the other image while keeping the rejected one held back", () => {
      setRegistry(`${BACK}:latest`, "sha256:back-b");

      const { status, calls, stderr } = runScript([FRONT_HEALTH, BACK_HEALTH]);

      expect(status).not.toBe(0);
      expect(restarts(calls)).toBe(1);
      expect(stderr).toContain("still rejected: front-end:latest sha256:front-bad");
      expect(localDigest(`${FRONT}:latest`)).toBe("sha256:front-a");
      expect(localDigest(`${BACK}:latest`)).toBe("sha256:back-b");
    });
  });
});
