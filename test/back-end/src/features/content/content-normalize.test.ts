import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { ProjectFrontmatter } from "shared";

import {
  normalizeContentDocument,
  validateContentDir,
} from "../../../../../back-end/src/features/content/content";

const REAL_CONTENT_DIR = resolve(import.meta.dir, "../../../../../content");

describe("normalizeContentDocument", () => {
  test("accepts a valid article and emits its fields", () => {
    const result = normalizeContentDocument("intro.md", {
      title: "Intro",
      publishDate: "2026-06-10",
      type: "article",
      category: "Linux",
      draft: false,
      socialImage: "images/cover.png",
      tags: ["flatpak"],
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toMatchObject({
        title: "Intro",
        date: "2026-06-10",
        type: "article",
        category: "Linux",
        socialImage: "images/cover.png",
      });
    }
  });

  test("defaults unknown types to article and unknown booleans to false", () => {
    const result = normalizeContentDocument("video.md", {
      title: "Video",
      date: "2026-01-01",
      type: "video",
      category: "Work",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toMatchObject({ type: "article", draft: false });
    }
  });

  test("defaults homeRecommended to false and honors an explicit true", () => {
    const withoutFlag = normalizeContentDocument("plain.md", {
      title: "Plain",
      date: "2026-01-01",
      type: "article",
      category: "Work",
    });

    const withFlag = normalizeContentDocument("curated.md", {
      title: "Curated",
      date: "2026-01-01",
      type: "article",
      category: "Work",
      homeRecommended: true,
    });

    expect(withoutFlag.ok).toBe(true);
    expect(withFlag.ok).toBe(true);

    if (withoutFlag.ok && withFlag.ok) {
      expect(withoutFlag.value).toMatchObject({ homeRecommended: false });
      expect(withFlag.value).toMatchObject({ homeRecommended: true });
    }
  });

  test("emits prioritySlot 1|2|3 and rejects out-of-range values", () => {
    const accepted = normalizeContentDocument("a.md", {
      title: "A",
      date: "2026-01-01",
      type: "project",
      coverImage: "/img.png",
      coverImageAlt: "img",
      prioritySlot: 2,
    });

    expect(accepted.ok).toBe(true);

    if (accepted.ok) {
      expect((accepted.value as ProjectFrontmatter).prioritySlot).toBe(2);
    }

    const rejected = normalizeContentDocument("b.md", {
      title: "B",
      date: "2026-01-01",
      type: "project",
      coverImage: "/img.png",
      coverImageAlt: "img",
      prioritySlot: 4,
    });

    expect(rejected.ok).toBe(false);

    if (!rejected.ok) {
      expect(rejected.error.field).toBe("prioritySlot");
    }
  });

  test("rejects invalid project status with its field", () => {
    const result = normalizeContentDocument("bad-status.md", {
      title: "Bad",
      date: "2026-01-01",
      type: "project",
      coverImage: "/img.png",
      coverImageAlt: "img",
      status: "In development",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.field).toBe("status");
      expect(result.error.file).toBe("bad-status.md");
    }
  });

  test("rejects non-string project status values", () => {
    const result = normalizeContentDocument("bad-status.md", {
      title: "Bad",
      date: "2026-01-01",
      type: "project",
      coverImage: "/img.png",
      coverImageAlt: "img",
      status: true,
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.field).toBe("status");
    }
  });

  test("rejects an article without a valid category instead of throwing", () => {
    const result = normalizeContentDocument("no-category.md", {
      title: "No Category",
      date: "2026-01-01",
      type: "article",
    });

    expect(result.ok).toBe(false);

    if (!result.ok) {
      expect(result.error.field).toBe("category");
    }
  });

  test("rejects a project without coverImage or coverImageAlt", () => {
    const noImage = normalizeContentDocument("no-cover.md", {
      title: "No Cover",
      date: "2026-01-01",
      type: "project",
    });

    expect(noImage.ok).toBe(false);

    if (!noImage.ok) {
      expect(noImage.error.field).toBe("coverImage");
    }
  });

  test("keeps a non-numeric created timeframe as written", () => {
    const result = normalizeContentDocument("range.md", {
      title: "Range",
      date: "2026-01-01",
      type: "project",
      coverImage: "/img.png",
      coverImageAlt: "img",
      created: "2024-2025",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value).toMatchObject({ created: "2024-2025" });
    }
  });

  test("emits every absent optional project field as null", () => {
    const result = normalizeContentDocument("minimal.md", {
      title: "Minimal",
      date: "2026-01-01",
      type: "project",
      coverImage: "/img.png",
      coverImageAlt: "img",
    });

    expect(result).toEqual({
      ok: true,
      value: {
        title: "Minimal",
        description: "",
        date: "2026-01-01",
        tags: [],
        type: "project",
        draft: false,
        slug: "minimal",
        socialImage: null,
        coverImage: "/img.png",
        coverImageAlt: "img",
        featured: false,
        projectOrder: 0,
        prioritySlot: null,
        status: null,
        role: null,
        created: null,
        links: [],
        info: null,
      },
    });
  });

  test("rejects non-object and untitled inputs", () => {
    expect(normalizeContentDocument("x.md", "not an object").ok).toBe(false);
    expect(normalizeContentDocument("x.md", { date: "2026-01-01" }).ok).toBe(false);
  });

  test.each([
    ["has neither date nor publishDate", {}],
    ["has a blank date and no publishDate", { date: "  " }],
    ["has blank date and publishDate", { date: "", publishDate: " " }],
    ["has a non-string date", { date: 2026 }],
  ])("rejects a document that %s with a date field error", (_case, dates) => {
    const result = normalizeContentDocument("undated.md", {
      title: "Undated",
      type: "article",
      category: "Linux",
      ...dates,
    });

    expect(result).toEqual({
      ok: false,
      error: { file: "undated.md", field: "date", message: "Missing required date or publishDate", value: undefined },
    });
  });

  test("falls back to publishDate when date is blank", () => {
    const result = normalizeContentDocument("fallback.md", {
      title: "Fallback",
      date: "",
      publishDate: "2026-06-10",
      type: "article",
      category: "Linux",
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.value.date).toBe("2026-06-10");
    }
  });
});

describe("validateContentDir", () => {
  test("reports every invalid document in a controlled directory", async () => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, "bad-status.md"), [
        "---",
        "title: Bad Status",
        "date: 2026-01-01",
        "type: project",
        "coverImage: /img.png",
        "coverImageAlt: img",
        "status: In development",
        "---",
        "# Bad Status",
      ].join("\n"));

      await writeFile(join(dir, "ok.md"), [
        "---",
        "title: Ok",
        "date: 2026-01-01",
        "type: article",
        "category: Work",
        "---",
        "# Ok",
      ].join("\n"));

      const errors = await validateContentDir(dir);

      expect(errors).toHaveLength(1);
      expect(errors[0]).toMatchObject({ file: "bad-status.md", field: "status" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test.each([
    ["no opening fence", "no-fence.md", ["title: No Fence", "date: 2026-01-01", "# Body"], /opening ---/],
    ["an unclosed fence", "unclosed.md", ["---", "title: Unclosed", "date: 2026-01-01", "# Body"], /never closed/],
    ["an empty frontmatter block", "empty.md", ["---", "---", "# Body"], /no fields/],
  ])("reports a document with %s", async (_label, file, lines, message) => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, file), lines.join("\n"));

      expect(await validateContentDir(dir)).toMatchObject([
        { file, field: null, message: expect.stringMatching(message) },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("passes the real content directory", async () => {
    expect(await validateContentDir(REAL_CONTENT_DIR)).toEqual([]);
  });
});
