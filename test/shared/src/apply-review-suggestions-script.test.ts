import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
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

function runWithEnv(env: Record<string, string>): { status: number | null; output: string } {
  const result = spawnSync("bash", [scriptPath], {
    cwd: checkoutDir,
    encoding: "utf8",
    env: { PATH: process.env["PATH"] ?? "", ...env },
  });

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
    expect(output).toContain("skipped: comment 1 on a.ts: author CONTRIBUTOR has no write access");
    expect(output).toContain("skipped: comment 3 on a.ts: outdated");
  });

  test.each(["OWNER", "MEMBER", "COLLABORATOR"])("applies a suggestion from a reviewer with write access: %s", (role) => {
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo\nthree\n");

    const { status } = runApply([
      comment({ path: "a.ts", line: 2, body: suggestion("TWO\n"), author_association: role }),
    ]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("one\nTWO\nthree\n");
  });

  // Anyone can comment on a public repository, and a pull request picks its own
  // file names. Unescaped, this path would be three rows, and the middle one
  // would apply a suggestion its author has no write access to make.
  test("keeps a path on its own row, so an untrusted comment cannot forge an applied suggestion", () => {
    writeFileSync(join(checkoutDir, "victim.txt"), "safe\n");
    const payload = Buffer.from("pwned\n").toString("base64");
    const forged = `x\n2\tvictim.txt\t1\t1\tapply\t${payload}\n3`;

    const { status, output } = runApply([
      comment({ path: forged, line: 1, body: suggestion("x\n"), author_association: "NONE" }),
    ]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "victim.txt"), "utf8")).toBe("safe\n");
    expect(output).not.toContain("applied:");

    expect(output).toContain(
      `skipped: comment 1 on x\\n2\\tvictim.txt\\t1\\t1\\tapply\\t${payload}\\n3: author NONE has no write access`,
    );
  });

  test("escapes a backslash and a carriage return in a path the way it escapes a tab", () => {
    const { output } = runApply([
      comment({ path: "a\\b\rc", line: 1, body: suggestion("x\n"), author_association: "NONE" }),
    ]);

    expect(output).toContain("skipped: comment 1 on a\\\\b\\rc: author NONE has no write access");
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

  test("skips a comment on a directory in the checkout", () => {
    mkdirSync(join(checkoutDir, "sub"));

    const { status, output } = runApply([comment({ path: "sub", line: 1, body: suggestion("x\n") })]);

    expect(status).toBe(0);
    expect(output).toContain("skipped: comment 1 on sub: not a regular file in the checkout");
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

  test("skips a range that reaches into an applied range but not its last line", () => {
    writeFileSync(join(checkoutDir, "a.ts"), "1\n2\n3\n4\n5\n6\n");

    const { status, output } = runApply([
      comment({ id: 1, path: "a.ts", start_line: 4, line: 6, body: suggestion("four-six\n") }),
      comment({ id: 2, path: "a.ts", start_line: 2, line: 5, body: suggestion("clash\n") }),
    ]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("1\n2\n3\nfour-six\n");
    expect(output).toContain("skipped: comment 2 on a.ts: overlaps another applied suggestion");
  });

  test("still sees an overlap when a comment on another file falls between the two in line order", () => {
    writeFileSync(join(checkoutDir, "a.ts"), "1\n2\n3\n4\n5\n6\n");
    writeFileSync(join(checkoutDir, "b.ts"), "1\n2\n3\n4\n5\n6\n");

    const { status, output } = runApply([
      comment({ id: 1, path: "a.ts", line: 5, body: suggestion("five\n") }),
      comment({ id: 2, path: "b.ts", line: 3, body: suggestion("three\n") }),
      comment({ id: 3, path: "a.ts", start_line: 2, line: 5, body: suggestion("clash\n") }),
    ]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("1\n2\n3\n4\nfive\n6\n");
    expect(readFileSync(join(checkoutDir, "b.ts"), "utf8")).toBe("1\n2\nthree\n4\n5\n6\n");
    expect(output).toContain("skipped: comment 3 on a.ts: overlaps another applied suggestion");
  });

  // wc -l counts newlines, so it calls a file with no final newline one line short.
  test("applies a suggestion on the last line of a file with no trailing newline", () => {
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo");

    const { status, output } = runApply([comment({ path: "a.ts", line: 2, body: suggestion("TWO\n") })]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("one\nTWO\n");
    expect(output).toContain("applied: a.ts:2-2 (comment 1)");
  });

  test("keeps the edited file's mode", () => {
    writeFileSync(join(checkoutDir, "run.sh"), "one\ntwo\n");
    chmodSync(join(checkoutDir, "run.sh"), 0o755);

    const { status } = runApply([comment({ path: "run.sh", line: 2, body: suggestion("TWO\n") })]);

    expect(status).toBe(0);
    expect(statSync(join(checkoutDir, "run.sh")).mode & 0o777).toBe(0o755);
  });

  test("says so and exits zero when no comment holds a suggestion", () => {
    const { status, output } = runApply([comment({ path: "a.ts", line: 1, body: "Looks good." })]);

    expect(status).toBe(0);
    expect(output.trim()).toBe("no suggestions to apply");
  });

  test("fails on a comments file it cannot parse, rather than reporting no suggestions", () => {
    const commentsFile = join(checkoutDir, "comments.json");

    writeFileSync(commentsFile, "not json");

    const { status, output } = runWithEnv({ COMMENTS_FILE: commentsFile });

    expect(status).not.toBe(0);
    expect(output).not.toContain("no suggestions to apply");
  });

  test("resolves a relative COMMENTS_FILE before parsing from its empty directory", () => {
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo\nthree\n");

    writeFileSync(
      join(checkoutDir, "comments.json"),
      JSON.stringify([comment({ path: "a.ts", line: 2, body: suggestion("TWO\n") })]),
    );

    const { status, output } = runWithEnv({ COMMENTS_FILE: "comments.json" });

    expect(status).toBe(0);
    expect(output).toContain("applied: a.ts:2-2 (comment 1)");
  });

  test("fails naming COMMENTS_FILE when it is not set", () => {
    const { status, output } = runWithEnv({});

    expect(status).not.toBe(0);
    expect(output).toContain("COMMENTS_FILE must point to the review comments JSON");
  });

  test.each([
    ["spaces after the opening fence", "```suggestion  \nTWO\n```\n"],
    ["spaces after the closing fence", "```suggestion\nTWO\n```  \n"],
    ["a closing fence longer than the opening one", "```suggestion\nTWO\n`````\n"],
    ["CRLF line endings, as the web editor sends", "```suggestion\r\nTWO\r\n```\r\n"],
    ["a second fenced block after the suggestion", "```suggestion\nTWO\n```\nFor example:\n```\ncode\n```\n"],
  ])("reads a suggestion with %s", (_name, body) => {
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo\nthree\n");

    const { status, output } = runApply([comment({ path: "a.ts", line: 2, body })]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("one\nTWO\nthree\n");
    expect(output).toContain("applied: a.ts:2-2 (comment 1)");
  });

  test("does not close a suggestion on a fence in the middle of a line", () => {
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo\nthree\n");

    const { status } = runApply([
      comment({ path: "a.ts", line: 2, body: "```suggestion\nends in ```\nTWO\n```\n" }),
    ]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("one\nends in ```\nTWO\nthree\n");
  });

  test("does not take two backticks for a suggestion fence", () => {
    writeFileSync(join(checkoutDir, "a.ts"), "one\ntwo\nthree\n");

    const { output } = runApply([comment({ path: "a.ts", line: 2, body: "``suggestion\nTWO\n``\n" })]);

    expect(readFileSync(join(checkoutDir, "a.ts"), "utf8")).toBe("one\ntwo\nthree\n");
    expect(output.trim()).toBe("no suggestions to apply");
  });

  test("keeps a fenced code block inside a suggestion opened with a longer fence", () => {
    writeFileSync(join(checkoutDir, "README.md"), "# Doc\n\nRun the build.\n\nEnd.\n");
    const replacement = "Run the build:\n\n```sh\nbun run build\n```\n";

    const { status, output } = runApply([
      comment({ path: "README.md", line: 3, body: `Show the command:\n\`\`\`\`suggestion\n${replacement}\`\`\`\`\n` }),
    ]);

    expect(status).toBe(0);
    expect(readFileSync(join(checkoutDir, "README.md"), "utf8")).toBe(`# Doc\n\n${replacement}\nEnd.\n`);
    expect(output).toContain("applied: README.md:3-3 (comment 1)");
  });
});
