import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const FRONT_END = resolve(import.meta.dir, "../../../../../front-end");
const FINE_HOVER_QUERY = "@media (hover: hover) and (pointer: fine)";

interface CssRule {
  /** Preludes of the enclosing blocks, outermost first, ending with the rule's own prelude. */
  path: string[];
  /** The declarations the block holds directly, outside its nested blocks. */
  body: string;
}

/** Flattens nested CSS into one entry per block. */
function cssRules(css: string): CssRule[] {
  const rules: CssRule[] = [];
  const stack: CssRule[] = [];
  let text = "";

  for (const char of css.replace(/\/\*[\s\S]*?\*\//g, "")) {
    if (char === "{") {
      const split = text.lastIndexOf(";") + 1;
      const parent = stack.at(-1);

      if (parent !== undefined) {
        parent.body += text.slice(0, split);
      }

      stack.push({ path: [...(parent?.path ?? []), text.slice(split).trim()], body: "" });
      text = "";
    } else if (char === "}") {
      const block = stack.pop();

      if (block !== undefined) {
        block.body = `${block.body}${text}`.trim();
        rules.push(block);
      }

      text = "";
    } else {
      text += char;
    }
  }

  return rules;
}

describe("touch baseline", () => {
  const baseRules = cssRules(readFileSync(resolve(FRONT_END, "src/index.css"), "utf8"))
    .filter((rule) => rule.path[0] === "@layer base");

  test("drops the grey tap flash and keeps text from inflating on rotate", () => {
    const html = baseRules.find((rule) => rule.path.at(-1) === "html");

    expect(html?.body).toContain("-webkit-tap-highlight-color: transparent;");
    expect(html?.body).toContain("-webkit-text-size-adjust: 100%;");
  });

  test("lets links and buttons answer a tap without waiting for a double tap", () => {
    const controls = baseRules.find((rule) => rule.path.at(-1) === "a, button");

    expect(controls?.body).toContain("touch-action: manipulation;");
  });

  test("never restricts zoom", () => {
    const viewport = /<meta name="viewport" content="([^"]*)"/.exec(readFileSync(resolve(FRONT_END, "index.html"), "utf8"))?.[1];

    expect(viewport).toBeDefined();
    expect(viewport).not.toContain("user-scalable");
    expect(viewport).not.toContain("maximum-scale");
  });
});

describe("home agentic call to action", () => {
  const ctaRules = cssRules(readFileSync(resolve(FRONT_END, "src/features/home/components/home-agentic.css"), "utf8"))
    .filter((rule) => rule.path.some((prelude) => prelude.includes("ha-cta")));

  test("applies its hover fill, lift and arrow nudge only where the pointer can hover", () => {
    const hoverRules = ctaRules.filter((rule) => rule.path.some((prelude) => prelude.includes(":hover")));

    expect(hoverRules.length).toBeGreaterThanOrEqual(3);

    for (const rule of hoverRules) {
      expect(rule.path).toContain(FINE_HOVER_QUERY);
    }
  });

  test("shrinks slightly while pressed", () => {
    const pressed = ctaRules.find((rule) => rule.path.at(-1) === "&:active");

    expect(pressed?.body).toContain("scale: 0.97;");
  });
});
