import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { readFrontmatter } from "../../../../../back-end/src/features/content/frontmatter";

const rootPath = resolve(import.meta.dirname, "../../../../..");
const scriptPath = resolve(rootPath, "scripts/nightly-compliance.sh");

let workDir: string;
let stubDir: string;
let contentDir: string;

// Stub `bun` so the script's dependency audit passes; only the draft guard is under test.
function writeBunStub(): void {
  const stubPath = join(stubDir, "bun");

  writeFileSync(stubPath, "#!/usr/bin/env bash\nexit 0\n");
  chmodSync(stubPath, 0o755);
}

function runScript(): { status: number | null; report: string } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: rootPath,
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${stubDir}:${process.env["PATH"] ?? ""}`,
      CONTENT_DIR: contentDir,
      GITHUB_SHA: "abc1234",
    },
  });

  return { status: result.status, report: result.stdout };
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "draft-guard-parity-"));
  stubDir = join(workDir, "bin");
  contentDir = join(workDir, "content");
  mkdirSync(stubDir);
  mkdirSync(contentDir);
  writeBunStub();
});

afterEach(() => {
  rmSync(workDir, { recursive: true, force: true });
});

// The guard's regex in scripts/nightly-compliance.sh is a hand-rolled mirror of
// frontmatter.ts's comment and boolean rules, not a call into it (bash can't
// import the TS parser) — it already desynced once (#875: a trailing ` # comment`
// slipped a draft past it). This calls the real `readFrontmatter` for the ground
// truth and checks the guard against it, so a future change to those rules fails
// loudly here instead of silently letting a draft leak or blocking a real publish.
// It lives in the back-end suite because it exercises the back-end parser.
describe("nightly compliance draft leak guard", () => {
  test.each([
    "draft: true",
    "draft: false",
    "draft: true # not ready yet",
    "draft: true\t# wip",
    "draft: true \r",
    "draft: true#wip",
    "draft: 'true'",
    'draft: "true"',
    "draft: TRUE",
    "draft: True",
    "draft: True # wip",
    "draft: tRue",
    "draft: false # shipped",
    // frontmatter.ts matches keys on `line.trimStart()`, so an indented key is top level (#912)
    // when the other top-level keys share its indent, and invalid under a key with a value
    // (#1033), left of the first key, or after a tab indent (#1035).
    " draft: true",
    "  draft: false",
  ])("agrees with the real front-matter parser on %p", (line) => {
    const indent = /^ */.exec(line)?.[0] ?? "";
    const content = `---\n${line}\n${indent}title: Parity\n---\n`;
    const parsed = readFrontmatter(content);

    if (!parsed.ok) {
      throw new Error(`fixture is not valid frontmatter: ${parsed.reason}`);
    }

    const isRealDraft = parsed.result.data["draft"] === true;

    writeFileSync(join(contentDir, "Parity.md"), content);

    const { status, report } = runScript();

    expect(status).toBe(isRealDraft ? 1 : 0);
    expect(report).toMatch(isRealDraft ? /Draft leak guard.*fail/ : /Draft leak guard.*pass/);
  });
});
