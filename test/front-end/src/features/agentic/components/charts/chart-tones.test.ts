import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { CHART_TONES, toneColor } from "../../../../../../../front-end/src/features/agentic/components/charts/chart-tones";

const INDEX_CSS_PATH = resolve(import.meta.dir, "../../../../../../../front-end/src/index.css");

function declarations(css: string, selector: string): Map<string, string> {
  const block = new RegExp(`^${selector.replace(".", "\\.")} \\{([\\s\\S]*?)^\\}`, "m").exec(css);

  if (!block) {
    throw new Error(`No ${selector} block in index.css`);
  }

  const withoutComments = block[1]!.replace(/\/\*[\s\S]*?\*\//g, "");

  return new Map([...withoutComments.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1]!, match[2]!.trim()]));
}

function resolveColor(value: string, tokens: Map<string, string>): string {
  const reference = /^var\((--[\w-]+)\)$/.exec(value);

  if (!reference) {
    return value;
  }

  const next = tokens.get(reference[1]!);

  if (next === undefined) {
    throw new Error(`index.css does not define ${reference[1]!}`);
  }

  return resolveColor(next, tokens);
}

function relativeLuminance(hex: string): number {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);

  if (!match) {
    throw new Error(`Expected a #rrggbb colour, got ${hex}`);
  }

  const [red, green, blue] = match.slice(1).map((channel) => {
    const value = Number.parseInt(channel, 16) / 255;

    return value <= 0.040_45 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });

  return (0.2126 * red!) + (0.7152 * green!) + (0.0722 * blue!);
}

function contrast(first: string, second: string): number {
  const [lighter, darker] = [relativeLuminance(first), relativeLuminance(second)].sort((a, b) => b - a);

  return (lighter! + 0.05) / (darker! + 0.05);
}

const css = readFileSync(INDEX_CSS_PATH, "utf8");
const lightTokens = declarations(css, ":root");
const themes = {
  light: lightTokens,
  dark: new Map([...lightTokens, ...declarations(css, ".dark")]),
};

describe("chart tones", () => {
  for (const [theme, tokens] of Object.entries(themes)) {
    test(`every tone has at least 3:1 contrast against the section well in ${theme} mode (WCAG 1.4.11)`, () => {
      const well = resolveColor("var(--site-section-well-bg)", tokens);

      for (const tone of CHART_TONES) {
        const ratio = contrast(resolveColor(toneColor(tone), tokens), well);

        expect({ tone, meetsThreeToOne: ratio >= 3 }).toEqual({ tone, meetsThreeToOne: true });
      }
    });
  }

  test("the light and dark themes give every tone a different shade", () => {
    for (const tone of CHART_TONES) {
      const light = resolveColor(toneColor(tone), themes.light);
      const dark = resolveColor(toneColor(tone), themes.dark);

      expect({ tone, differs: light !== dark }).toEqual({ tone, differs: true });
    }
  });
});
