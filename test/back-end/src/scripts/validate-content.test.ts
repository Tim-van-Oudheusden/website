import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const backEndDir = resolve(import.meta.dir, "../../../../back-end");

interface CliRun {
  exitCode: number;
  stderr: string[];
}

/** Run the real `validate:content` entry from `backEndRoot` and capture its report. */
async function runValidateContent(backEndRoot: string): Promise<CliRun> {
  const child = Bun.spawn(["bun", "run", "src/scripts/validate-content.ts"], {
    cwd: backEndRoot,
    stdout: "ignore",
    stderr: "pipe",
  });

  const [exitCode, stderr] = await Promise.all([child.exited, new Response(child.stderr).text()]);

  return { exitCode, stderr: stderr.split("\n").filter((line) => line !== "") };
}

describe("validate:content CLI", () => {
  test("passes on the repository's content/ directory", async () => {
    const { exitCode, stderr } = await runValidateContent(backEndDir);

    expect(stderr).toEqual(["Content validation passed."]);
    expect(exitCode).toBe(0);
  }, 10000);

  describe("against a fixture content/ directory", () => {
    // The CLI resolves content/ relative to its own file, so it runs from a
    // copy of back-end/src placed next to a fixture content/ directory.
    let root: string;

    async function useContent(files: Record<string, string>): Promise<void> {
      const contentDir = join(root, "content");

      await rm(contentDir, { recursive: true, force: true });
      await mkdir(contentDir);

      for (const [name, body] of Object.entries(files)) {
        await writeFile(join(contentDir, name), body);
      }
    }

    beforeAll(async () => {
      root = await mkdtemp(join(tmpdir(), "validate-content-cli-"));
      await cp(join(backEndDir, "src"), join(root, "back-end", "src"), { recursive: true });
      await symlink(join(backEndDir, "node_modules"), join(root, "back-end", "node_modules"), "dir");
    });

    afterAll(async () => {
      await rm(root, { recursive: true, force: true });
    });

    test("exits 0 and reports success when every document is valid", async () => {
      await useContent({
        "intro.md": ["---", "title: Intro", "date: 2026-06-10", "type: article", "category: Linux", "---", "# Intro"].join("\n"),
        "notes.txt": "not markdown, never validated",
      });

      const { exitCode, stderr } = await runValidateContent(join(root, "back-end"));

      expect(stderr).toEqual(["Content validation passed."]);
      expect(exitCode).toBe(0);
    }, 10000);

    test("exits 1 and lists each invalid document with its field, or `document` when none", async () => {
      await useContent({
        "intro.md": ["---", "title: Intro", "date: 2026-06-10", "type: article", "category: Linux", "---", "# Intro"].join("\n"),
        "no-category.md": ["---", "title: Missing Category", "date: 2026-06-10", "type: article", "---", "# Body"].join("\n"),
        "no-fence.md": "# Just a heading, no frontmatter",
        "unclosed.md": ["---", "title: Unclosed", "date: 2026-06-10", "# Body"].join("\n"),
      });

      const { exitCode, stderr } = await runValidateContent(join(root, "back-end"));

      // One line per invalid document (directory order), then the summary.
      expect(stderr.slice(0, -1).sort()).toEqual([
        "- no-category.md (category): Article must declare a valid \"category\"",
        "- no-fence.md (document): Frontmatter is missing its opening --- fence",
        "- unclosed.md (document): Frontmatter block is never closed with ---",
      ]);

      expect(stderr.at(-1)).toBe("Content validation failed: 3 invalid document(s).");
      expect(exitCode).toBe(1);
    }, 10000);
  });
});
