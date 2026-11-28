import { describe, expect, test } from "bun:test";

import { attribute, SOURCES } from "../../../shared/src/pr-source";

describe("attribute", () => {
  test("reads the agent and model from a Hive signature line", () => {
    expect(
      attribute({
        headRefName: "claude/issue-1-fix",
        body: "Adds a test.\n\n— hive: agent=quality backend=claude model=claude-opus-5-5 effort=high\n",
      }),
    ).toEqual({ source: "Hive", agent: "quality", model: "claude-opus-5-5" });
  });

  test("reads the ASCII signature Hive has signed with since 2026-11-20", () => {
    expect(
      attribute({
        headRefName: "craftsman/1381-signature",
        body: "Fixes #1381\n\n-- hive: agent=craftsman backend=claude model=claude-opus-5-5 effort=high claude=2.1.332\n",
      }),
    ).toEqual({ source: "Hive", agent: "craftsman", model: "claude-opus-5-5" });
  });

  test("leaves the agent blank for a Hive contributor run, which signs without agent=", () => {
    expect(
      attribute({ headRefName: "fix/5-change", body: "— hive: backend=omp model=anthropic/claude-opus-5-5 effort=high" }),
    ).toEqual({ source: "Hive", agent: "—", model: "anthropic/claude-opus-5-5" });
  });

  test("only counts a signature that starts its own line", () => {
    expect(attribute({ headRefName: "docs/6-readme", body: "quoting — hive: agent=quality" }).source).toBe("Other");
  });

  test("parses a long signature with no key=value pairs in linear time", () => {
    const started = performance.now();

    expect(attribute({ headRefName: "fix/1-x", body: `— hive: ${"a".repeat(100_000)}` })).toEqual({
      source: "Hive",
      agent: "—",
      model: "—",
    });

    expect(performance.now() - started).toBeLessThan(1000);
  });

  test("falls back to the branch prefix when the body carries no signature", () => {
    expect(attribute({ headRefName: "claude/issue-1-fix", body: "" })).toEqual({
      source: "Claude Code (CI)",
      agent: "—",
      model: "—",
    });

    expect(attribute({ headRefName: "dependabot/bun/minor-and-patch-abc", body: "" })).toEqual({
      source: "Dependabot",
      agent: "—",
      model: "—",
    });

    expect(attribute({ headRefName: "docs/6-readme", body: "" })).toEqual({ source: "Other", agent: "—", model: "—" });
  });

  test("names every source a report lists, in report order", () => {
    expect(SOURCES).toEqual(["Hive", "Claude Code (CI)", "Dependabot", "Other"]);
  });
});
