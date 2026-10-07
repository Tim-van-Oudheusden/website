import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface EslintMessage {
  ruleId: string | null;
  message: string;
}

interface EslintFileResult {
  output?: string;
  messages: EslintMessage[];
}

interface FixtureLocation {
  /** Directory inside an ESLint project's `include`, so type-aware rules can parse the fixture. */
  directory: string;
  extension: "ts" | "tsx";
}

const rootPath = resolve(import.meta.dirname, "../../..");
const sharedFixture: FixtureLocation = { directory: import.meta.dirname, extension: "ts" };
const frontEndFixture: FixtureLocation = { directory: resolve(rootPath, "test/front-end/src"), extension: "tsx" };

/**
 * Runs the repo ESLint config on `source`; with `fix`, autofix runs as a dry run and only
 * unfixed problems are reported. The source is written to a real file inside an ESLint
 * project: type-aware parsing reads in-project files from disk, so `--stdin` would lint
 * the on-disk copy.
 */
function eslintRun(source: string, location: FixtureLocation, fix: boolean): EslintFileResult {
  const fixturePath = resolve(location.directory, `lint-style-fixture-${String(process.pid)}.${location.extension}`);

  writeFileSync(fixturePath, source);

  try {
    const result = spawnSync(
      "bun",
      ["run", "eslint", ...(fix ? ["--fix-dry-run"] : []), "--format", "json", fixturePath],
      { cwd: rootPath, encoding: "utf8" },
    );
    const [fileResult] = JSON.parse(result.stdout) as EslintFileResult[];

    if (fileResult === undefined) {
      throw new Error(`ESLint produced no result:\n${result.stderr}`);
    }

    return fileResult;
  } finally {
    rmSync(fixturePath, { force: true });
  }
}

describe("lint house style", () => {
  // Type-aware ESLint builds the project program on first run; budget like workspace-scripts.test.ts.
  test("autofix rewrites TypeScript into the house formatting", () => {
    const messy = [
      "export const greeting = 'hello'",
      "export function check(items: string[], limit: number): number {",
      "  const count = items.length",
      "  const ok = count > 0 &&",
      "    limit > 0",
      "  if (ok) return limit",
      "  for (const item of items) { console.warn(item) }",
      "  return count",
      "}",
      "export const config = {",
      "  'name': greeting,",
      "  limit: 3",
      "}",
      "",
    ].join("\n");

    const formatted = [
      "export const greeting = \"hello\";",
      "",
      "export function check(items: string[], limit: number): number {",
      "  const count = items.length;",
      "  const ok = count > 0",
      "    && limit > 0;",
      "",
      "  if (ok) {",
      "    return limit;",
      "  }",
      "",
      "  for (const item of items) {",
      "    console.warn(item);",
      "  }",
      "",
      "  return count;",
      "}",
      "",
      "export const config = {",
      "  name: greeting,",
      "  limit: 3,",
      "};",
      "",
    ].join("\n");

    expect(eslintRun(messy, sharedFixture, true).output ?? messy).toBe(formatted);
  }, 30_000);

  test("reports code-shape, import, naming, and React rule violations", () => {
    const source = [
      "import { cn } from \"@/shared/lib/utils\";",
      "import { ARTICLE_CATEGORIES } from \"shared\";",
      "import { type ReactNode, Fragment } from \"react\";",
      "import { useState } from \"react\";",
      "import * as React from \"react\";",
      "",
      "export enum Tone { Calm }",
      "",
      "export namespace Legacy { export const value = 1; }",
      "",
      "export class Store {",
      "  constructor(private readonly name: string) {}",
      "}",
      "",
      "export interface IBadgeProps { label: string }",
      "",
      "export const shout = (text: string): string => text + \"!\";",
      "",
      "export function describeTone(tone: number): string {",
      "  if (tone > 1) {",
      "    return \"loud\";",
      "  } else {",
      "    return tone > 0 ? \"calm\" : tone < 0 ? \"quiet\" : \"silent\";",
      "  }",
      "}",
      "",
      "export function Badge({ label }: IBadgeProps): ReactNode {",
      "  if (label === \"\") {",
      "    const [count] = useState(0);",
      "",
      "    return count;",
      "  }",
      "",
      "  const parts = { label: label };",
      "",
      "  return (",
      "    <Fragment>",
      "      <input disabled={true} />",
      "      {parts.label.length && <span>{cn(React.version)}</span>}",
      "      {ARTICLE_CATEGORIES.length}",
      "    </Fragment>",
      "  );",
      "}",
      "",
      "export default Badge;",
      "",
    ].join("\n");

    const { messages } = eslintRun(source, frontEndFixture, false);
    const ruleIds = messages.map((message) => message.ruleId);
    const restrictedSyntaxMessages = messages
      .filter((message) => message.ruleId === "no-restricted-syntax")
      .map((message) => message.message)
      .join("\n");

    expect(ruleIds).toEqual(expect.arrayContaining([
      "perfectionist/sort-imports",
      "no-duplicate-imports",
      "@typescript-eslint/naming-convention",
      "func-style",
      "prefer-template",
      "no-else-return",
      "no-nested-ternary",
      "object-shorthand",
      "react-hooks/rules-of-hooks",
      "@eslint-react/no-leaked-conditional-rendering",
    ]));

    // Hooks belong to eslint-plugin-react-hooks; @eslint-react's duplicate must stay silent.
    expect(ruleIds).not.toContain("@eslint-react/rules-of-hooks");

    for (const expected of [
      "default exports",
      "`enum`",
      "`namespace`",
      "parameter properties",
      "inline `type` specifier",
      "Import React APIs by name",
      "boolean shorthand",
      "`<>`",
    ]) {
      expect(restrictedSyntaxMessages).toContain(expected);
    }
  }, 30_000);

  test("rejects the shadcn registry's `cn` package import in favour of the shared helper", () => {
    const source = [
      "import { cn } from \"cn\";",
      "",
      "export const classes = cn(\"a\", \"b\");",
      "",
    ].join("\n");

    const restrictedImportMessages = eslintRun(source, frontEndFixture, false).messages
      .filter((message) => message.ruleId === "no-restricted-imports")
      .map((message) => message.message);

    expect(restrictedImportMessages).toHaveLength(1);
    expect(restrictedImportMessages[0]).toContain("@/shared/lib/utils");
  }, 30_000);
});
