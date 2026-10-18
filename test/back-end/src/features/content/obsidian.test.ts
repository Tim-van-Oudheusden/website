import { describe, expect, test } from "bun:test";

import { rewriteObsidianImageEmbeds } from "../../../../../back-end/src/features/content/obsidian";

describe("rewriteObsidianImageEmbeds", () => {
  test("rewrites ![[images/pixel.gif]] to markdown image with content-assets route", () => {
    const input = "Intro\n\n![[images/pixel.gif]]\n";
    const output = rewriteObsidianImageEmbeds(input);

    expect(output).toContain("![](/content-assets/images/pixel.gif)");
  });

  test.each([
    ["pixel.gif", "/content-assets/images/pixel.gif"],
    ["/images/pixel.gif", "/content-assets/images/pixel.gif"],
    ["content/images/pixel.gif", "/content-assets/images/pixel.gif"],
    ["/content/images/pixel.gif", "/content-assets/images/pixel.gif"],
    ["content-assets/images/pixel.gif", "/content-assets/images/pixel.gif"],
    ["/content-assets/images/pixel.gif", "/content-assets/images/pixel.gif"],
    ["images/diagrams/flow.svg", "/content-assets/images/diagrams/flow.svg"],
  ])("resolves embed path %p to %p", (embedPath, assetPath) => {
    expect(rewriteObsidianImageEmbeds(`![[${embedPath}]]`)).toBe(`![](${assetPath})`);
  });

  test("drops a heading or block fragment from the embed path", () => {
    expect(rewriteObsidianImageEmbeds("![[images/pixel.gif#^block]]")).toBe("![](/content-assets/images/pixel.gif)");
  });

  test("percent-encodes each path segment but keeps the separators", () => {
    expect(rewriteObsidianImageEmbeds("![[images/my shots/día 1.png]]")).toBe(
      "![](/content-assets/images/my%20shots/d%C3%ADa%201.png)",
    );
  });

  test("matches image extensions case-insensitively", () => {
    expect(rewriteObsidianImageEmbeds("![[images/Photo.PNG]]")).toBe("![](/content-assets/images/Photo.PNG)");
  });

  test.each([
    ["a note embed", "![[Some Note]]"],
    ["a non-image file", "![[images/report.pdf]]"],
    ["a blank path", "![[   ]]"],
    ["a fragment-only path", "![[#heading]]"],
  ])("leaves %s untouched", (_label, embed) => {
    expect(rewriteObsidianImageEmbeds(`before ${embed} after`)).toBe(`before ${embed} after`);
  });

  test("uses the option after the pipe as alt text", () => {
    expect(rewriteObsidianImageEmbeds("![[images/pixel.gif| A tiny pixel ]]")).toBe(
      "![A tiny pixel](/content-assets/images/pixel.gif)",
    );
  });

  test.each(["300", "300x200", "300X200", " "])("treats size option %p as no alt text", (option) => {
    expect(rewriteObsidianImageEmbeds(`![[images/pixel.gif|${option}]]`)).toBe("![](/content-assets/images/pixel.gif)");
  });

  test("rewrites every embed in the document", () => {
    const input = "![[a.png]] text ![[Note]] text ![[images/b.jpg|B]]";

    expect(rewriteObsidianImageEmbeds(input)).toBe(
      "![](/content-assets/images/a.png) text ![[Note]] text ![B](/content-assets/images/b.jpg)",
    );
  });

  test.each([
    ["a single-backtick span", "`![[images/pixel.gif]]`"],
    ["a double-backtick span", "``a ` and ![[images/pixel.gif]]``"],
  ])("leaves an embed inside %s untouched", (_label, span) => {
    expect(rewriteObsidianImageEmbeds(`Write ${span} to embed.`)).toBe(`Write ${span} to embed.`);
  });

  test("rewrites embeds on both sides of a code span", () => {
    expect(rewriteObsidianImageEmbeds("![[a.png]] `![[b.png]]` ![[c.png]]")).toBe(
      "![](/content-assets/images/a.png) `![[b.png]]` ![](/content-assets/images/c.png)",
    );
  });

  test("still rewrites an embed after a backtick that opens no code span", () => {
    expect(rewriteObsidianImageEmbeds("A stray ` here.\n\n![[a.png]] and `x`")).toBe(
      "A stray ` here.\n\n![](/content-assets/images/a.png) and `x`",
    );
  });

  test.each([
    ["a backtick fence", "```md\n![[images/pixel.gif|Alt]]\n```"],
    ["a tilde fence", "~~~\n![[images/pixel.gif]]\n~~~"],
    ["an indented fence in a list item", "- Step:\n\n    ```\n    ![[images/pixel.gif]]\n    ```"],
    ["a fence in a callout", "> [!tip]\n> ```\n> ![[images/pixel.gif]]\n> ```"],
  ])("leaves an embed inside %s untouched", (_label, block) => {
    expect(rewriteObsidianImageEmbeds(block)).toBe(block);
  });

  test("rewrites embeds before and after a fenced code block", () => {
    const input = "![[a.png]]\n\n```\n![[b.png]]\n```\n\n![[c.png]]\n";

    expect(rewriteObsidianImageEmbeds(input)).toBe(
      "![](/content-assets/images/a.png)\n\n```\n![[b.png]]\n```\n\n![](/content-assets/images/c.png)\n",
    );
  });

  test("closes a fence only on a bare run of the same character at least as long", () => {
    const input = "````\n```\n~~~~\n```` not a close\n![[a.png]]\n````\n![[b.png]]";

    expect(rewriteObsidianImageEmbeds(input)).toBe(
      "````\n```\n~~~~\n```` not a close\n![[a.png]]\n````\n![](/content-assets/images/b.png)",
    );
  });

  test("treats an unclosed fence as code to the end of the body", () => {
    const input = "![[a.png]]\n```\n![[b.png]]\n";

    expect(rewriteObsidianImageEmbeds(input)).toBe("![](/content-assets/images/a.png)\n```\n![[b.png]]\n");
  });
});
