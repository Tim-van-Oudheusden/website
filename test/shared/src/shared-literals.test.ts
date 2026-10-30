import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Values written out in more than one file that cannot read each other: a
// GitHub expression can't see a shell variable, a shell script can't import a
// TypeScript constant, a doc can't import anything. Each row names one such
// value and reads every copy of it; the copies must agree, and each reader must
// find its copy exactly once, so a copy that changes shape fails here instead
// of dropping out of the check. A new shared value is a new row (#1005).

const ROOT = resolve(import.meta.dirname, "../../..");

interface Copy {
  /** Repo-relative file holding the copy. */
  file: string;
  /** Where in the file the copy sits, for failure messages. */
  where: string;
  /** Reads the copy from the file's text; throws when it can't find it exactly once. */
  read: (text: string) => unknown;
}

interface SharedLiteral {
  /** The value, and what goes wrong when its copies differ. */
  name: string;
  copies: readonly Copy[];
}

type ReadFile = (relativePath: string) => string;

function readRootFile(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

/** The capture groups of the single match of the global `pattern` in `text`. */
function only(text: string, pattern: RegExp, what: string): string[] {
  const matches = [...text.matchAll(pattern)];

  if (matches.length !== 1) {
    throw new Error(`expected exactly one ${what} matching ${String(pattern)}, found ${String(matches.length)}`);
  }

  return matches[0]?.slice(1) ?? [];
}

/** The string at `path` in the YAML document `text`. */
function yamlString(text: string, path: readonly string[]): string {
  let node: unknown = Bun.YAML.parse(text);

  for (const key of path) {
    if (typeof node !== "object" || node === null || !(key in node)) {
      throw new Error(`no ${path.join(".")} in the YAML`);
    }

    node = (node as Record<string, unknown>)[key];
  }

  if (typeof node !== "string") {
    throw new Error(`${path.join(".")} is not a string`);
  }

  return node;
}

/**
 * The labels an expression at `path` of a workflow tests the event's label
 * against: `contains(fromJSON('[...]'), github.event.label.name)`.
 */
function workflowLabelList(path: readonly string[]): (text: string) => string[] {
  return (text) => {
    const [list = ""] = only(
      yamlString(text, path),
      /contains\(fromJSON\('([^']*)'\), github\.event\.label\.name\)/g,
      "fromJSON label list",
    );

    return [...new Set(JSON.parse(list) as string[])].sort();
  };
}

/**
 * The labels that keep a pull request out in the `all(.labels[]; ...)` jq
 * filter of the shell function `fn`: each `.name != env.X` term, followed
 * through the command's `X="$VAR"` prefix to the script's `VAR=value` line.
 */
function scriptKeepOutLabels(fn: string): (text: string) => string[] {
  return (text) => {
    const [body = ""] = only(text, new RegExp(`^${fn}\\(\\) \\{\\n([\\s\\S]*?)^\\}$`, "gm"), `${fn}() function`);
    const [filter = ""] = only(body, /all\(\.labels\[\]; ([^)]*)\)/g, "label filter");
    const labels = filter.split(" and ").map((term) => {
      const [env = ""] = only(term, /^\.name != env\.(\w+)$/g, "`.name != env.X` term");
      const [variable = ""] = only(body, new RegExp(`\\b${env}="\\$(\\w+)"`, "g"), `${env}= prefix`);
      const [label = ""] = only(text, new RegExp(`^${variable}=([\\w-]+)$`, "gm"), `${variable}= assignment`);

      return label;
    });

    return [...new Set(labels)].sort();
  };
}

const MERGE_QUEUE_SCRIPT = "scripts/merge-queue.sh";
const MERGE_QUEUE_WORKFLOW = ".github/workflows/merge-queue.yml";

const SHARED_LITERALS: readonly SharedLiteral[] = [
  {
    name:
      "merge-queue keep-out labels: the script never picks or lands a PR carrying one, and the workflow starts"
      + " a queue run when one comes off; the two workflow copies must agree or an ignored event can replace a"
      + " pending run that would merge (#1005)",
    copies: [
      { file: MERGE_QUEUE_SCRIPT, where: "next(): candidate filter", read: scriptKeepOutLabels("next") },
      { file: MERGE_QUEUE_SCRIPT, where: "land(): still-ready filter", read: scriptKeepOutLabels("land") },
      { file: MERGE_QUEUE_WORKFLOW, where: "concurrency.group", read: workflowLabelList(["concurrency", "group"]) },
      { file: MERGE_QUEUE_WORKFLOW, where: "jobs.pick.if", read: workflowLabelList(["jobs", "pick", "if"]) },
    ],
  },
];

interface CopyValue {
  copy: string;
  value: unknown;
}

function readCopies(literal: SharedLiteral, readFile: ReadFile): CopyValue[] {
  return literal.copies.map((copy) => {
    const copyName = `${copy.file}: ${copy.where}`;

    try {
      return { copy: copyName, value: copy.read(readFile(copy.file)) };
    } catch (error) {
      throw new Error(`${copyName}: ${(error as Error).message}`, { cause: error });
    }
  });
}

/** `relativePath`'s text with each `from`, which must occur exactly once, replaced by its `to`. */
function withReplaced(relativePath: string, replacements: readonly (readonly [string, string])[]): ReadFile {
  let text = readRootFile(relativePath);

  for (const [from, to] of replacements) {
    const parts = text.split(from);

    if (parts.length !== 2) {
      throw new Error(`${from} occurs ${String(parts.length - 1)} times in ${relativePath}`);
    }

    text = parts.join(to);
  }

  return (path) => (path === relativePath ? text : readRootFile(path));
}

for (const literal of SHARED_LITERALS) {
  describe(literal.name, () => {
    test("every copy holds the same value", () => {
      expect(literal.copies.length).toBeGreaterThan(1);
      const values = readCopies(literal, readRootFile);
      const first = values[0]?.value;

      expect(values).toEqual(values.map(({ copy }) => ({ copy, value: first })));
    });
  });
}

describe("reading copies", () => {
  const keepOut = SHARED_LITERALS[0]!;

  test("a workflow copy that drifts reads a different value from the others", () => {
    const readFile = withReplaced(MERGE_QUEUE_WORKFLOW, [
      [
        `\n          && (github.event.action == 'ready_for_review' || contains(fromJSON('["hold","sentinel-alert"]')`,
        `\n          && (github.event.action == 'ready_for_review' || contains(fromJSON('["hold"]')`,
      ],
    ]);

    expect(readCopies(keepOut, readFile).map(({ value }) => value)).toEqual([
      ["hold", "sentinel-alert"],
      ["hold", "sentinel-alert"],
      ["hold", "sentinel-alert"],
      ["hold"],
    ]);
  });

  test("a label added to one script filter is read through its variable", () => {
    const readFile = withReplaced(MERGE_QUEUE_SCRIPT, [
      ["\nSENTINEL_LABEL=sentinel-alert\n", "\nSENTINEL_LABEL=sentinel-alert\nWIP_LABEL=wip\n"],
      [
        `candidates="$(HOLD="$HOLD_LABEL" SENTINEL="$SENTINEL_LABEL" gh pr list`,
        `candidates="$(HOLD="$HOLD_LABEL" SENTINEL="$SENTINEL_LABEL" WIP="$WIP_LABEL" gh pr list`,
      ],
      [
        `| select(all(.labels[]; .name != env.HOLD and .name != env.SENTINEL))`,
        `| select(all(.labels[]; .name != env.HOLD and .name != env.SENTINEL and .name != env.WIP))`,
      ],
    ]);

    expect(readCopies(keepOut, readFile).map(({ value }) => value)).toEqual([
      ["hold", "sentinel-alert", "wip"],
      ["hold", "sentinel-alert"],
      ["hold", "sentinel-alert"],
      ["hold", "sentinel-alert"],
    ]);
  });

  test.each([
    [
      "the workflow's label list is gone",
      MERGE_QUEUE_WORKFLOW,
      `|| contains(fromJSON('["hold","sentinel-alert"]'), github.event.label.name)))\n    runs-on`,
      `|| github.event.label.name == 'hold'))\n    runs-on`,
      /merge-queue\.yml: jobs\.pick\.if: expected exactly one fromJSON label list .*, found 0/,
    ],
    [
      "the script's filter has a term of another shape",
      MERGE_QUEUE_SCRIPT,
      `      | select(all(.labels[]; .name != env.HOLD and .name != env.SENTINEL))`,
      `      | select(all(.labels[]; .name != env.HOLD and (.name | startswith("wip") | not)))`,
      /merge-queue\.sh: next\(\): candidate filter: expected exactly one `\.name != env\.X` term/,
    ],
    [
      "the script's label variable is quoted",
      MERGE_QUEUE_SCRIPT,
      "\nSENTINEL_LABEL=sentinel-alert\n",
      `\nSENTINEL_LABEL="sentinel-alert"\n`,
      /merge-queue\.sh: next\(\): candidate filter: expected exactly one SENTINEL_LABEL= assignment .*, found 0/,
    ],
  ])("fails, naming the copy, when %s", (_case, file, from, to, message) => {
    expect(() => readCopies(keepOut, withReplaced(file, [[from, to]]))).toThrow(message);
  });
});
