import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { buildRepoPrActivity, needsNextPage } from "../../../../../back-end/src/features/hive/repo-pr-activity";

/** A trimmed sample of this repo's public pull list (GitHub REST, 2026-11-02) seeded with canaries. */
const PULLS: unknown = JSON.parse(readFileSync(join(import.meta.dir, "fixtures", "github-pulls.json"), "utf8"));

const NOW = new Date("2026-11-02T15:00:00Z");

/** A GitHub pull with the kept fields; merged unless `merged_at` is overridden. */
function pr(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    title: "t",
    user: { login: "someone" },
    body: "",
    created_at: "2026-10-30T10:00:00Z",
    updated_at: "2026-10-30T12:00:00Z",
    closed_at: "2026-10-30T12:00:00Z",
    merged_at: "2026-10-30T12:00:00Z",
    head: { ref: "feat/1-x" },
    ...overrides,
  };
}

describe("buildRepoPrActivity allowlist", () => {
  test("titles, body text, branch names and logins never reach the output", () => {
    const repo = buildRepoPrActivity(PULLS, NOW);
    const serialised = JSON.stringify(repo);

    expect(Object.keys(repo ?? {}).sort()).toEqual([
      "days",
      "from",
      "medianHoursToMerge",
      "mergedBySource",
      "p90HoursToMerge",
      "to",
    ]);

    for (const canary of [
      "allowlisted Hive public metrics builder",
      "Filed by quality agent",
      "hive: agent=quality",
      "feat/1059-hive-allowlist-builder",
      "dependabot/bun",
      "hive-worker-bee",
      "Tim-van-Oudheusden",
    ]) {
      expect(serialised).not.toContain(canary);
    }
  });
});

describe("buildRepoPrActivity days", () => {
  test("counts opened, merged and closed-unmerged PRs per UTC day over the 7 days ending today, oldest first", () => {
    const repo = buildRepoPrActivity(PULLS, NOW);

    expect(repo?.from).toBe("2026-10-27T00:00:00.000Z");
    expect(repo?.to).toBe("2026-11-02T15:00:00.000Z");

    expect(repo?.days).toEqual([
      { t: "2026-10-27T00:00:00.000Z", opened: 0, merged: 0, closedUnmerged: 0 },
      { t: "2026-10-28T00:00:00.000Z", opened: 1, merged: 1, closedUnmerged: 0 },
      { t: "2026-10-29T00:00:00.000Z", opened: 1, merged: 0, closedUnmerged: 1 },
      { t: "2026-10-30T00:00:00.000Z", opened: 1, merged: 1, closedUnmerged: 0 },
      { t: "2026-10-31T00:00:00.000Z", opened: 0, merged: 0, closedUnmerged: 0 },
      { t: "2026-11-01T00:00:00.000Z", opened: 2, merged: 0, closedUnmerged: 0 },
      { t: "2026-11-02T00:00:00.000Z", opened: 1, merged: 2, closedUnmerged: 0 },
    ]);
  });

  test("ignores events outside the window, counting each event on its own day", () => {
    const repo = buildRepoPrActivity([
      pr({ created_at: "2026-10-26T23:59:59Z", closed_at: "2026-10-27T00:00:00Z", merged_at: "2026-10-27T00:00:00Z" }),
      pr({ created_at: "2026-10-20T08:00:00Z", closed_at: "2026-10-26T23:59:59Z", merged_at: null }),
      pr({ created_at: "2026-11-03T00:00:00Z", closed_at: "2026-11-03T01:00:00Z", merged_at: null }),
    ], NOW);

    expect(repo?.days.map(({ opened, merged, closedUnmerged }) => [opened, merged, closedUnmerged])).toEqual([
      [0, 1, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ]);
  });
});

describe("buildRepoPrActivity mergedBySource", () => {
  test("splits each day's merged PRs by the repo's attribution rule", () => {
    const repo = buildRepoPrActivity(PULLS, NOW);

    expect(repo?.mergedBySource).toEqual([
      { t: "2026-10-27T00:00:00.000Z", hive: 0, claudeCode: 0, dependabot: 0, other: 0 },
      { t: "2026-10-28T00:00:00.000Z", hive: 0, claudeCode: 0, dependabot: 1, other: 0 },
      { t: "2026-10-29T00:00:00.000Z", hive: 0, claudeCode: 0, dependabot: 0, other: 0 },
      { t: "2026-10-30T00:00:00.000Z", hive: 0, claudeCode: 1, dependabot: 0, other: 0 },
      { t: "2026-10-31T00:00:00.000Z", hive: 0, claudeCode: 0, dependabot: 0, other: 0 },
      { t: "2026-11-01T00:00:00.000Z", hive: 0, claudeCode: 0, dependabot: 0, other: 0 },
      { t: "2026-11-02T00:00:00.000Z", hive: 1, claudeCode: 0, dependabot: 0, other: 1 },
    ]);
  });
});

describe("buildRepoPrActivity hours to merge", () => {
  test("takes nearest-rank median and p90 over PRs merged in the window, created to merged", () => {
    const mergedAt = Date.parse("2026-11-01T12:00:00Z");
    const hours = [7, 1, 10, 4, 2, 9, 3, 6, 8, 5];
    const repo = buildRepoPrActivity([
      ...hours.map((h) => pr({
        created_at: new Date(mergedAt - h * 3_600_000).toISOString(),
        closed_at: "2026-11-01T12:00:00Z",
        merged_at: "2026-11-01T12:00:00Z",
      })),
      pr({ created_at: "2026-10-20T00:00:00Z", closed_at: "2026-10-26T12:00:00Z", merged_at: "2026-10-26T12:00:00Z" }),
    ], NOW);

    expect(repo?.medianHoursToMerge).toBe(5);
    expect(repo?.p90HoursToMerge).toBe(9);
  });

  test("is null when nothing merged in the window", () => {
    const repo = buildRepoPrActivity([
      pr({ created_at: "2026-11-01T08:00:00Z", closed_at: "2026-11-01T09:00:00Z", merged_at: null }),
      pr({ created_at: "2026-10-20T00:00:00Z", closed_at: "2026-10-26T12:00:00Z", merged_at: "2026-10-26T12:00:00Z" }),
    ], NOW);

    expect(repo?.medianHoursToMerge).toBeNull();
    expect(repo?.p90HoursToMerge).toBeNull();
  });
});

describe("buildRepoPrActivity malformed input", () => {
  test("is null when GitHub did not answer with a list", () => {
    for (const pulls of [null, undefined, "[]", { message: "API rate limit exceeded" }]) {
      expect(buildRepoPrActivity(pulls, NOW)).toBeNull();
    }
  });

  test("skips entries with a missing or malformed kept field", () => {
    const valid = pr({ created_at: "2026-11-01T10:00:00Z", closed_at: "2026-11-01T12:00:00Z", merged_at: "2026-11-01T12:00:00Z" });
    const malformed = [
      null,
      "pull",
      pr({ created_at: "yesterday", closed_at: "2026-11-01T12:00:00Z", merged_at: "2026-11-01T12:00:00Z" }),
      pr({ created_at: undefined }),
      pr({ merged_at: undefined }),
      pr({ closed_at: 1_761_998_400_000, merged_at: null }),
      pr({ head: null }),
      pr({ body: 42 }),
    ];

    const repo = buildRepoPrActivity([...malformed, valid], NOW);

    expect(repo).toEqual(buildRepoPrActivity([valid], NOW));
    expect(repo?.medianHoursToMerge).toBe(2);
  });

  test("is null when no entry is usable, but zero counts for an empty list", () => {
    expect(buildRepoPrActivity([null, pr({ created_at: "yesterday" }), pr({ head: {} })], NOW)).toBeNull();
    expect(buildRepoPrActivity([], NOW)?.days.every(({ opened }) => opened === 0)).toBe(true);
  });
});

describe("needsNextPage", () => {
  /** A page of `size` pulls updated an hour apart, newest first, the oldest at `oldest`. */
  function page(size: number, oldest: string): Record<string, unknown>[] {
    return Array.from({ length: size }, (_, index) => pr({
      updated_at: new Date(Date.parse(oldest) + (size - 1 - index) * 3_600_000).toISOString(),
    }));
  }

  test("asks for the next page only while a full page still ends inside the window", () => {
    expect(needsNextPage(page(100, "2026-10-27T00:00:00Z"), NOW)).toBe(true);
    expect(needsNextPage(page(100, "2026-10-26T23:59:59Z"), NOW)).toBe(false);
    expect(needsNextPage(page(99, "2026-10-28T00:00:00Z"), NOW)).toBe(false);
  });
});
