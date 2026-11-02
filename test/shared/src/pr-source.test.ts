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

  test("leaves the agent blank for a Hive contributor run, which signs without agent=", () => {
    expect(
      attribute({ headRefName: "fix/5-change", body: "— hive: backend=omp model=anthropic/claude-opus-5-5 effort=high" }),
    ).toEqual({ source: "Hive", agent: "—", model: "anthropic/claude-opus-5-5" });
  });

  test("only counts a signature that starts its own line", () => {
    expect(attribute({ headRefName: "docs/6-readme", body: "quoting — hive: agent=quality" }).source).toBe("Other");
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
