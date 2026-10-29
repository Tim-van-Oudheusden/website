import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// Hand mutants for the shell scripts, which no mutation-testing tool covers.
// Each row changes one string in a script and names the test file that must
// fail on the result. A row whose mutant survives marks a branch that runs but
// that no assertion pins (#924, #939). Add a row when a hand mutation run finds
// one and a test kills it; see docs/testing.md "Mutation testing".

const rootPath = resolve(import.meta.dirname, "../../..");

interface ShellMutant {
  /** What a test must notice: the behaviour the mutant breaks, and where it came from. */
  name: string;
  /** Repo-relative script the mutant is applied to. */
  file: string;
  /** Text replaced; it must occur exactly once in `file`. */
  from: string;
  to: string;
  /** Repo-relative test file that must fail with the mutant applied. */
  killedBy: string;
}

const UPDATE_SCRIPT = "deploy/systemd/website-update.sh";
const UPDATE_TEST = "test/shared/src/website-update-script.test.ts";
const MERGE_QUEUE_SCRIPT = "scripts/merge-queue.sh";
const MERGE_QUEUE_TEST = "test/shared/src/merge-queue-script.test.ts";

const MUTANTS: readonly ShellMutant[] = [
  {
    name: "a still-rejected image with no local :latest before the pull is not rolled back to a stale :rollback (#924)",
    file: UPDATE_SCRIPT,
    from: `    if [[ -n "\${before[$name]}" && "\${before[$name]}" != "\${after[$name]}" ]]; then`,
    to: `    if [[ "\${before[$name]}" != "\${after[$name]}" ]]; then`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "the unheld skip-replay path only tags back images that had a local :latest (#939)",
    file: UPDATE_SCRIPT,
    from: `    if [[ -n "\${before[$name]}" ]]; then\n      restore_rollback "$name"\n    fi\n  done\n  exit 1`,
    to: `      restore_rollback "$name"\n  done\n  exit 1`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "the unheld skip-replay path says why it skips the pod restart (#939)",
    file: UPDATE_SCRIPT,
    from: `  echo "skipping pod restart: a rejected image has nothing to roll back to" >&2\n`,
    to: "",
    killedBy: UPDATE_TEST,
  },
  {
    name: "the unheld skip-replay path exits non-zero",
    file: UPDATE_SCRIPT,
    from: `  done\n  exit 1\nfi`,
    to: `  done\n  exit 0\nfi`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "a failed replay only rolls back images that had a local :latest before the pull",
    file: UPDATE_SCRIPT,
    from: `  if [[ -n "\${before[$name]}" ]]; then\n    restore_rollback "$name"\n    reject "$name"`,
    to: `  if true; then\n    restore_rollback "$name"\n    reject "$name"`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "a failed replay records the new digest as rejected",
    file: UPDATE_SCRIPT,
    from: `    reject "$name" "\${after[$name]}"\n`,
    to: "",
    killedBy: UPDATE_TEST,
  },
  {
    name: "a failed replay restarts the pod on the rolled-back images",
    file: UPDATE_SCRIPT,
    from: `echo "replaying podman-kube@website.service with rolled-back image(s)" >&2\nsystemctl --user restart podman-kube@website.service`,
    to: `echo "replaying podman-kube@website.service with rolled-back image(s)" >&2`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "only an image with a local :latest is tagged as :rollback before the pull",
    file: UPDATE_SCRIPT,
    from: `  if [[ -n "\${before[$name]}" ]]; then\n    podman tag "$ref:latest" "$ref:rollback"`,
    to: `  if true; then\n    podman tag "$ref:latest" "$ref:rollback"`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "a still-rejected digest makes the run exit non-zero",
    file: UPDATE_SCRIPT,
    from: "    still_rejected=1\n",
    to: "",
    killedBy: UPDATE_TEST,
  },
  {
    name: "an unchanged run still exits non-zero while a digest is rejected",
    file: UPDATE_SCRIPT,
    from: `  echo "images unchanged; skipping pod restart"\n  exit "$still_rejected"`,
    to: `  echo "images unchanged; skipping pod restart"\n  exit 0`,
    killedBy: UPDATE_TEST,
  },
  {
    name: "land warns when it cannot read the issues a merged PR closes (#994)",
    file: MERGE_QUEUE_SCRIPT,
    from: `    echo "::warning title=Merge queue::could not read the issues #\${number} closes; close them by hand"\n`,
    to: "    :\n",
    killedBy: MERGE_QUEUE_TEST,
  },
  {
    name: "next fails instead of reporting an empty queue when listing PRs fails (#994)",
    file: MERGE_QUEUE_SCRIPT,
    from: `| "\\(.number) \\(.headRefOid)"')"`,
    to: `| "\\(.number) \\(.headRefOid)"' || true)"`,
    killedBy: MERGE_QUEUE_TEST,
  },
];

let shadowRoot: string | null = null;

/**
 * Builds a throwaway view of the repository: `realPaths` (and the directories
 * leading to them) are real copies, everything else is a symlink back to the
 * checkout. A test file resolves the script relative to its own location, so a
 * copied test file runs against the copied, mutated script, and the checkout
 * itself is never written to.
 */
function shadowRepo(realPaths: readonly string[]): string {
  const root = mkdtempSync(join(tmpdir(), "shell-mutant-"));

  function mirror(relDir: string): void {
    for (const entry of readdirSync(join(rootPath, relDir))) {
      const rel = relDir === "" ? entry : `${relDir}/${entry}`;

      if (realPaths.includes(rel)) {
        copyFileSync(join(rootPath, rel), join(root, rel));
      } else if (realPaths.some((path) => path.startsWith(`${rel}/`))) {
        mkdirSync(join(root, rel));
        mirror(rel);
      } else {
        symlinkSync(join(rootPath, rel), join(root, rel));
      }
    }
  }

  mirror("");

  return root;
}

function runTestFile(root: string, testFile: string): { status: number | null; output: string } {
  const result = spawnSync(process.execPath, ["test", `./${testFile}`], { cwd: root, encoding: "utf8" });

  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

afterEach(() => {
  if (shadowRoot !== null) {
    rmSync(shadowRoot, { recursive: true, force: true });
    shadowRoot = null;
  }
});

describe("shell mutants", () => {
  // Without this control, a harness that cannot run the copied test file at
  // all would count every mutant as killed.
  test.each([...new Set(MUTANTS.map((mutant) => mutant.killedBy))])(
    "%s passes on an unmutated copy",
    (testFile) => {
      shadowRoot = shadowRepo([testFile]);

      const { status, output } = runTestFile(shadowRoot, testFile);

      expect(output).not.toContain("(fail)");
      expect(status).toBe(0);
    },
    30_000,
  );

  for (const mutant of MUTANTS) {
    test(`${mutant.killedBy} notices: ${mutant.name}`, () => {
      const source = readFileSync(resolve(rootPath, mutant.file), "utf8");

      // A stale row (the script changed under it) must fail here, not pass silently.
      expect(source.split(mutant.from).length - 1).toBe(1);

      shadowRoot = shadowRepo([mutant.file, mutant.killedBy]);
      writeFileSync(join(shadowRoot, mutant.file), source.replace(mutant.from, () => mutant.to));

      const { status, output } = runTestFile(shadowRoot, mutant.killedBy);

      expect(output).toContain("(fail)");
      expect(status).not.toBe(0);
    }, 30_000);
  }
});
