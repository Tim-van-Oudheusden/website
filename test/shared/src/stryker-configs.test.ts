import { describe, expect, test } from "bun:test";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";

const rootPath = resolve(import.meta.dirname, "../../..");

interface StrykerConfig {
  mutate: string[];
}

async function loadMutate(name: string): Promise<string[]> {
  const config = (await import(resolve(rootPath, `stryker/${name}.conf.mjs`))) as {
    default: StrykerConfig;
  };

  return config.default.mutate;
}

/** The repository files a Stryker `mutate` list selects: any positive glob, no `!` glob. */
function selected(mutate: string[], files: string[]): string[] {
  const include = mutate.filter((glob) => !glob.startsWith("!")).map((glob) => new Bun.Glob(glob));
  const exclude = mutate
    .filter((glob) => glob.startsWith("!"))
    .map((glob) => new Bun.Glob(glob.slice(1)));

  return files.filter(
    (file) => include.some((glob) => glob.match(file)) && !exclude.some((glob) => glob.match(file)),
  );
}

function sources(dirs: string[]): string[] {
  return dirs
    .flatMap((dir) =>
      readdirSync(resolve(rootPath, dir), { recursive: true, encoding: "utf8" }).map(
        (file) => `${dir}/${file}`,
      ),
    )
    .filter((file) => /\.tsx?$/.test(file) && !file.endsWith(".d.ts"))
    .sort();
}

// Every mutant runs the workspace's whole suite, so the two largest workspaces
// are each mutated by two configs that run as separate jobs and each finish
// inside the job's timeout: the split-out folder, and the rest. Together the
// pair must cover the workspace's sources, each file exactly once.
describe.each([
  {
    rest: "back-end",
    part: "back-end-content",
    partDir: "back-end/src/features/content/",
    files: sources(["back-end/src"]),
  },
  {
    rest: "front-end",
    part: "front-end-features",
    partDir: "front-end/src/features/",
    files: sources(["front-end/src", "front-end/server"]).filter(
      (file) => !file.startsWith("front-end/src/shared/components/ui/"),
    ),
  },
])("stryker/$rest and stryker/$part", ({ rest, part, partDir, files }) => {
  test("split the workspace's sources without overlap or gaps", async () => {
    const restFiles = selected(await loadMutate(rest), files);
    const partFiles = selected(await loadMutate(part), files);

    expect(partFiles.length).toBeGreaterThan(0);
    expect(partFiles.filter((file) => !file.startsWith(partDir))).toEqual([]);
    expect(partFiles.filter((file) => restFiles.includes(file))).toEqual([]);
    expect([...restFiles, ...partFiles].sort()).toEqual(files);
  });
});
