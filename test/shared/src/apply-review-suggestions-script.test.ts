import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");
const scriptPath = resolve(rootPath, "scripts/apply-review-suggestions.sh");

let checkoutDir: string;

interface ReviewComment {
  id: number;
  path: string;
  body: string;
  line: number | null;
  start_line?: number | null;
  side?: string;
  author_association?: string;
}

function comment(overrides: Partial<ReviewComment> & Pick<ReviewComment, "path" | "body" | "line">): ReviewComment {
  return { id: 1, start_line: null, side: "RIGHT", author_association: "OWNER", ...overrides };
}

function suggestion(text: string): string {
  return `Nit:\n\n\`\`\`suggestion\n${text}\`\`\`\n`;
}

function runApply(comments: ReviewComment[], pathPrefix?: string): { status: number | null; output: string } {
  const commentsFile = join(checkoutDir, "..", `${checkoutDir.split("/").pop() ?? ""}-comments.json`);

  writeFileSync(commentsFile, JSON.stringify(comments));
  const result = spawnSync("bash", [scriptPath], {
    cwd: checkoutDir,
    encoding: "utf8",
    env: { PATH: [pathPrefix, process.env["PATH"] ?? ""].filter(Boolean).join(":"), COMMENTS_FILE: commentsFile },
  });

  rmSync(commentsFile, { force: true });

  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

beforeEach(() => {
  checkoutDir = mkdtempSync(join(tmpdir(), "apply-review-"));
});

afterEach(() => {
  rmSync(checkoutDir, { recursive: true, force: true });
});

describe("scripts/apply-review-suggestions.sh", () => {
  test("applies a maintainer's single-line suggestion to the commented line", () => {
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo\nthree\n");

    const { status, output } = runApply([comment({ path: "a.ts", line: 2, body: suggestion("TWO\n") })]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("one\nTWO\nthree\n");
    expect(output).toContain("applied");
  });

  test("applies suggestions on a host without jq", () => {
    const binDir = `${checkoutDir}-bin`;

    mkdirSync(binDir);
    writeFileSync(join(binDir, "jq"), "#!/bin/sh\necho 'jq: command not found' >&2\nexit 127\n");
    chmodSync(join(binDir, "jq"), 0o755);
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo\nthree\n");

    try {
      const { status, output } = runApply([comment({ path: "a.ts", line: 2, body: suggestion("TWO\n") })], binDir);

      expect(status).toBe(0);
      expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("one\nTWO\nthree\n");
      expect(output).toContain("applied: a.ts:2-2 (comment 1)");
    } finally {
      rmSync(binDir, { recursive: true, force: true });
    }
  });

  test("skips suggestions from authors without write access and outdated comments", () => {
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo\nthree\n");

    const { status, output } = runApply([
      comment({ id: 1, path: "a.ts", line: 1, body: suggestion("ONE\n"), author_association: "CONTRIBUTOR" }),
      comment({ id: 2, path: "a.ts", line: 2, body: suggestion("TWO\n"), author_association: "NONE" }),
      comment({ id: 3, path: "a.ts", line: null, body: suggestion("THREE\n") }),
    ]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("one\ntwo\nthree\n");
    expect(output).not.toContain("applied:");
  });

  test("refuses paths outside the checkout and files that do not exist", () => {
    const outsideFile = `${checkoutDir}-outside.txt`;

    writeFileSync(outsideFile, "secret\n");

    try {
      const { status, output } = runApply([
        comment({ id: 1, path: `../${checkoutDir.split("/").pop() ?? ""}-outside.txt`, line: 1, body: suggestion("pwned\n") }),
        comment({ id: 2, path: outsideFile, line: 1, body: suggestion("pwned\n") }),
        comment({ id: 3, path: "missing.ts", line: 1, body: suggestion("x\n") }),
      ]);

      expect(status).toBe(0);
      expect(readFileSync(outsideFile, "utf8")).toBe("secret\n");
      expect(output).not.toContain("applied:");
      expect(output).toContain("skipped: comment 3");
    } finally {
      rmSync(outsideFile, { force: true });
    }
  });

  test("refuses files reached through a symlinked directory that points outside the checkout", () => {
    const outsideDir = `${checkoutDir}-outside`;

    mkdirSync(outsideDir);
    writeFileSync(join(outsideDir, "secret.txt"), "secret\n");
    symlinkSync(outsideDir, join(checkoutDir, "linked"));

    try {
      const { status, output } = runApply([comment({ path: "linked/secret.txt", line: 1, body: suggestion("pwned\n") })]);

      expect(status).toBe(0);
      expect(readFileSync(join(outsideDir, "secret.txt"), "utf8")).toBe("secret\n");
      expect(output).not.toContain("applied:");
    } finally {
      rmSync(outsideDir, { recursive: true, force: true });
    }
  });

  test("never runs a bunfig.toml preload from the pull request checkout", () => {
    const markerFile = `${checkoutDir}-preload-ran`;

    writeFileSync(join(checkoutDir, "bunfig.toml"), 'preload = ["./preload.ts"]\n');
    writeFileSync(join(checkoutDir, "preload.ts"), `require("node:fs").writeFileSync(${JSON.stringify(markerFile)}, "ran");\n`);
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo\nthree\n");

    try {
      const { status, output } = runApply([comment({ path: "a.ts", line: 2, body: suggestion("TWO\n") })]);

      expect(status).toBe(0);
      expect(existsSync(markerFile)).toBe(false);
      expect(output).toContain("applied: a.ts:2-2 (comment 1)");
    } finally {
      rmSync(markerFile, { force: true });
    }
  });

  test("applies several multi-line suggestions in one file and skips one overlapping an applied range", () => {
    writeFileSync(join(checkoutDir, "a.ts"), "1\n2\n3\n4\n5\n6\n");

    const { status, output } = runApply([
      comment({ id: 1, path: "a.ts", start_line: 1, line: 2, body: suggestion("one-two\n") }),
      comment({ id: 2, path: "a.ts", start_line: 4, line: 5, body: suggestion("") }),
      comment({ id: 3, path: "a.ts", line: 6, body: suggestion("six\nseven\n") }),
      comment({ id: 4, path: "a.ts", start_line: 5, line: 6, body: suggestion("clash\n") }),
    ]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("one-two\n3\nsix\nseven\n");
    expect(output).toContain("skipped: comment 4");
  });
});

describe(".github/workflows/auto-review.yml", () => {
  const workflowPath = resolve(rootPath, ".github/workflows/auto-review.yml");

  test("applies suggestions on a maintainer's /apply-suggestions PR comment, never via inline event text", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toContain("issue_comment:");
    expect(workflow).toContain("/apply-suggestions");
    expect(workflow).toMatch(/OWNER.*MEMBER.*COLLABORATOR/);
    expect(workflow).toContain("scripts/apply-review-suggestions.sh");
    expect(workflow).not.toMatch(/\$\{\{\s*github\.event\.(comment|issue)\.(body|title)/);
  });
});
