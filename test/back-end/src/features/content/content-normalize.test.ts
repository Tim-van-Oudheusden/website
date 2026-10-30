import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { ProjectFrontmatter } from "shared";

import {
  normalizeContentDocument,
  normalizeDate,
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

  test("emits each valid project link as written", () => {
    const result = normalizeContentDocument("linked.md", {
      title: "Linked",
      date: "2026-01-01",
      type: "project",
      coverImage: "/img.png",
      coverImageAlt: "img",
      links: [
        { type: "repo", label: "Source", href: "https://example.com/repo" },
        { type: "article", label: "Write-up", href: "/articles/write-up" },
      ],
    });

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect((result.value as ProjectFrontmatter).links).toEqual([
        { type: "repo", label: "Source", href: "https://example.com/repo" },
        { type: "article", label: "Write-up", href: "/articles/write-up" },
      ]);
    }
  });

  const validLink = { type: "repo", label: "Source", href: "https://example.com/repo" };

  test.each([
    [
      "a links value that is not a list",
      "https://example.com/repo",
      "links must be a list of `- type: ...` blocks, each with a label and an href",
      "https://example.com/repo",
    ],
    [
      "a link written as plain text",
      [validLink, "https://example.com/demo"],
      "Each link must be a `- type: ...` block with a label and an href",
      "https://example.com/demo",
    ],
    [
      "a link with an unknown type",
      [validLink, { type: "website", label: "Site", href: "https://example.com" }],
      "Link type must be one of demo, repo, docs, article, external",
      { type: "website", label: "Site", href: "https://example.com" },
    ],
    [
      "a link whose type differs in case",
      [{ type: "Repo", label: "Source", href: "https://example.com/repo" }],
      "Link type must be one of demo, repo, docs, article, external",
      { type: "Repo", label: "Source", href: "https://example.com/repo" },
    ],
    [
      "a link without a label",
      [validLink, { type: "docs", href: "https://example.com/docs" }],
      "Link must have a text label",
      { type: "docs", href: "https://example.com/docs" },
    ],
    [
      "a link with a misspelled href",
      [{ type: "demo", label: "Demo", herf: "https://example.com/demo" }],
      "Link must have a text href",
      { type: "demo", label: "Demo", herf: "https://example.com/demo" },
    ],
  ])("rejects %s with a links error naming the entry", (_case, links, message, value) => {
    const result = normalizeContentDocument("bad-links.md", {
      title: "Bad links",
      date: "2026-01-01",
      type: "project",
      coverImage: "/img.png",
      coverImageAlt: "img",
      links,
    });

    expect(result).toEqual({ ok: false, error: { file: "bad-links.md", field: "links", message, value } });
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

  // The parser reads unquoted `2025` and `true` as a number and a boolean (#835).
  test.each([
    ["article", "title", 1984],
    ["article", "description", 42],
    ["article", "slug", 2025],
    ["article", "socialImage", true],
    ["project", "coverImage", 7],
    ["project", "coverImageAlt", false],
    ["project", "role", 1],
    ["project", "info", 100],
  ])("rejects an unquoted number or boolean in the %s text field %s, naming the fix", (type, field, value) => {
    const result = normalizeContentDocument("numeric.md", {
      title: "Numeric",
      date: "2026-01-01",
      type,
      category: "Work",
      coverImage: "/img.png",
      coverImageAlt: "img",
      [field]: value,
    });

    expect(result).toEqual({
      ok: false,
      error: {
        file: "numeric.md",
        field,
        message: `${field} must be text; put the value in quotes, e.g. ${field}: "${String(value)}"`,
        value,
      },
    });
  });

  test.each([2025, true])("rejects an unquoted number or boolean tag (%p), naming the fix", (tag) => {
    const result = normalizeContentDocument("numeric-tag.md", {
      title: "Numeric tag",
      date: "2026-01-01",
      type: "article",
      category: "Work",
      tags: ["retrospective", tag],
    });

    expect(result).toEqual({
      ok: false,
      error: {
        file: "numeric-tag.md",
        field: "tags",
        message: `Tag must be text; put it in quotes, e.g. - "${String(tag)}"`,
        value: tag,
      },
    });
  });

  test("ignores project-only text fields on an article", () => {
    const result = normalizeContentDocument("article-role.md", {
      title: "Article",
      date: "2026-01-01",
      type: "article",
      category: "Work",
      role: 1,
    });

    expect(result.ok).toBe(true);
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

describe("normalizeDate", () => {
  // The frontmatter parser yields only string scalars for dates; a Date from
  // any other caller must not leak a full ISO timestamp past the YYYY-MM-DD contract.
  test("returns null for a Date object instead of a timestamp", () => {
    expect(normalizeDate(new Date("2026-10-02T00:00:00Z"))).toBeNull();
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
    ["a flow list", "tags: [Linux, Containers]", "[Linux, Containers]"],
    ["a single scalar", "tags: Linux", "Linux"],
  ])("reports tags written as %s instead of dropping them", async (_label, tagsLine, value) => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, "flow-tags.md"), [
        "---",
        "title: Flow Tags",
        "date: 2026-01-01",
        "type: article",
        "category: Linux",
        tagsLine,
        "---",
        "# Flow Tags",
      ].join("\n"));

      expect(await validateContentDir(dir)).toMatchObject([
        { file: "flow-tags.md", field: "tags", message: expect.stringMatching(/one `- item` per line/), value },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  // The front-end formats these dates with Intl, which throws on an invalid
  // date and blanks the page; a parseable non-ISO date shows the wrong day.
  test.each([
    ["date", "2026-13-01"],
    ["date", "13-10-2026"],
    ["date", "2026-02-30"],
    ["date", "2026-10-2"],
    ["date", "soon"],
    ["publishDate", "2026-13-01"],
  ])("reports a %s of %s that is not a YYYY-MM-DD calendar day", async (field, value) => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, "bad-date.md"), [
        "---",
        "title: Bad Date",
        `${field}: ${value}`,
        "type: article",
        "category: Linux",
        "---",
        "# Bad Date",
      ].join("\n"));

      await writeFile(join(dir, "ok.md"), [
        "---",
        "title: Ok",
        "date: 2026-10-02",
        "type: article",
        "category: Linux",
        "---",
        "# Ok",
      ].join("\n"));

      expect(await validateContentDir(dir)).toEqual([
        { file: "bad-date.md", field, message: `${field} must be a YYYY-MM-DD calendar day`, value },
      ]);
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

  test("reports a slug that a second document already uses, across content types", async () => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, "a-article.md"), [
        "---",
        "title: Article",
        "date: 2026-01-01",
        "type: article",
        "category: Work",
        "slug: shared-slug",
        "---",
        "# Article",
      ].join("\n"));

      await writeFile(join(dir, "b-project.md"), [
        "---",
        "title: Project",
        "date: 2026-01-01",
        "type: project",
        "coverImage: /img.png",
        "coverImageAlt: img",
        "slug: shared-slug",
        "---",
        "# Project",
      ].join("\n"));

      const errors = await validateContentDir(dir);

      expect(errors).toHaveLength(1);

      expect(errors[0]).toMatchObject({
        field: "slug",
        value: "shared-slug",
        message: expect.stringMatching(/already used by/),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  // A rewrite drafted next to the published article, under the same slug:
  // getContentBySlug serves the published one in production.
  test("accepts a draft sharing a published document's slug, in either directory order", async () => {
    function article(draft: boolean): string {
      return ["---", "title: Article", "date: 2026-01-01", "category: Work", "slug: shared-slug", `draft: ${String(draft)}`, "---", "Body"].join("\n");
    }

    // Same names, contents swapped: whatever order readdir returns, one of the
    // two directories lists the draft first.
    const dirs = await Promise.all([0, 1].map(() => mkdtemp(join(tmpdir(), "website-content-validate-"))));

    try {
      for (const [index, dir] of dirs.entries()) {
        await writeFile(join(dir, "first.md"), article(index === 0));
        await writeFile(join(dir, "second.md"), article(index !== 0));
      }

      for (const dir of dirs) {
        expect(await validateContentDir(dir)).toEqual([]);
      }
    } finally {
      await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
    }
  });

  test.each([
    ["a question mark from the file name", "Is this real?.md", []],
    ["a hash", "hash.md", ["slug: c#-notes"]],
    ["a slash", "slash.md", ["slug: linux/flatpak"]],
    ["a percent sign", "percent.md", ["slug: 100%-done"]],
    ["a backslash", "backslash.md", ["slug: back\\slash"]],
  ])("reports a slug containing %s", async (_label, file, slugLines) => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, file), [
        "---",
        "title: Unroutable",
        "date: 2026-01-01",
        "type: article",
        "category: Work",
        ...slugLines,
        "---",
        "# Unroutable",
      ].join("\n"));

      expect(await validateContentDir(dir)).toMatchObject([
        { file, field: "slug", message: expect.stringMatching(/cannot appear in a URL path segment/) },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  function taggedArticle(tags: readonly string[], extraLines: readonly string[] = []): string {
    return ["---", "title: Tagged", "date: 2026-01-01", "category: Work", ...extraLines, "tags:", ...tags.map((tag) => `  - ${tag}`), "---", "Body"].join("\n");
  }

  test.each([
    ["an emoji", "\u{1F980}"],
    ["only punctuation", "'...'"],
  ])("reports an article tag made of %s, whose /tags/ link would be empty", async (_label, tag) => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, "symbol-tag.md"), taggedArticle(["Linux", tag]));

      expect(await validateContentDir(dir)).toMatchObject([
        { file: "symbol-tag.md", field: "tags", message: expect.stringMatching(/no letter, digit, "\+" or "#"/) },
      ]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("reports a second spelling of a tag that links to the same /tags/ page, drafts included", async () => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, "a-dotnet.md"), taggedArticle([".NET"], ["slug: dotnet"]));
      await writeFile(join(dir, "b-net.md"), taggedArticle(["NET"], ["slug: net", "draft: true"]));

      const errors = await validateContentDir(dir);

      expect(errors).toHaveLength(1);

      expect(errors[0]).toMatchObject({
        field: "tags",
        value: expect.stringMatching(/^\.?NET$/),
        message: expect.stringMatching(/\/tags\/net .*\.?NET/),
      });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("accepts tags that differ only in letter case, spaces, hyphens or underscores, and C, C++ and C#", async () => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, "a.md"), taggedArticle(["Content API", "C", "C++"], ["slug: a"]));
      await writeFile(join(dir, "b.md"), taggedArticle(["content-api", "C#", "content_API"], ["slug: b"]));

      expect(await validateContentDir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("leaves project tags alone: they link to no tag page", async () => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, "project.md"), [
        "---",
        "title: Project",
        "date: 2026-01-01",
        "type: project",
        "coverImage: /img.png",
        "coverImageAlt: img",
        "tags:",
        "  - \u{1F980}",
        "---",
        "# Project",
      ].join("\n"));

      expect(await validateContentDir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("reports a numeric slug and tag written unquoted instead of serving the file name", async () => {
    const dir = await mkdtemp(join(tmpdir(), "website-content-validate-"));

    try {
      await writeFile(join(dir, "year.md"), taggedArticle(["retrospective"], ["slug: 2025"]));
      await writeFile(join(dir, "tagged.md"), taggedArticle(["2025"], ["slug: tagged"]));
      await writeFile(join(dir, "quoted.md"), taggedArticle(['"2026"'], ['slug: "2026"']));

      const errors = await validateContentDir(dir);

      expect(errors).toHaveLength(2);

      expect(errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ file: "year.md", field: "slug", value: 2025 }),
        expect.objectContaining({ file: "tagged.md", field: "tags", value: 2025 }),
      ]));
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("passes the real content directory", async () => {
    expect(await validateContentDir(REAL_CONTENT_DIR)).toEqual([]);
  });
});
