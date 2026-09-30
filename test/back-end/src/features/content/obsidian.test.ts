import { describe, expect, test } from "bun:test";
import { rewriteObsidianImageEmbeds } from "../../../../../back-end/src/features/content/obsidian";

describe("rewriteObsidianImageEmbeds", () => {
  test("rewrites ![[images/pixel.gif]] to markdown image with content-assets route", () => {
    const input = "Intro\n\n![[images/pixel.gif]]\n";
    const output = rewriteObsidianImageEmbeds(input);
    expect(output).toContain("![](/content-assets/images/pixel.gif)");
  });
});
