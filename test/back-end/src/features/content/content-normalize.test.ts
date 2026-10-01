import { describe, expect, test } from "bun:test";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
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

  test("rejects non-object and untitled inputs", () => {
    expect(normalizeContentDocument("x.md", "not an object").ok).toBe(false);
    expect(normalizeContentDocument("x.md", { date: "2026-01-01" }).ok).toBe(false);
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

  test("passes the real content directory", async () => {
    expect(await validateContentDir(REAL_CONTENT_DIR)).toEqual([]);
  });
});