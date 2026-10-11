import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const INDEX_CSS_PATH = resolve(import.meta.dir, "../../../../../front-end/src/index.css");
const css = readFileSync(INDEX_CSS_PATH, "utf8");

/** WCAG 2.2 SC 1.4.3 Contrast (Minimum), AA, for body text. */
const AA_TEXT = 4.5;
/** WCAG 2.2 SC 1.4.11 Non-text Contrast, for UI boundaries and focus rings. */
const AA_NON_TEXT = 3;

/** Custom properties declared directly in the first `<selector> { ... }` block. */
function declarations(selector: string): Map<string, string> {
  const start = css.indexOf(`\n${selector} {`);

  if (start === -1) {
    throw new Error(`index.css has no ${selector} block`);
  }

  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("\n}", start));

  return new Map([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((match) => [match[1]!, match[2]!.trim()]));
}

const rootTokens = declarations(":root");
const darkTokens = declarations(".dark");

/** A token's dark-mode value: `.dark` overrides `:root`, and `var()` references resolve in dark mode too. */
function darkValue(name: string, seen: string[] = []): string {
  if (seen.includes(name)) {
    throw new Error(`Cyclic token ${[...seen, name].join(" -> ")}`);
  }

  const value = darkTokens.get(name) ?? rootTokens.get(name);

  if (value === undefined) {
    throw new Error(`Token ${name} is not defined`);
  }

  const reference = /^var\((--[\w-]+)\)$/.exec(value);

  return reference === null ? value : darkValue(reference[1]!, [...seen, name]);
}

function rgb(name: string): [number, number, number] {
  const value = darkValue(name);
  const hex = /^#([0-9a-f]{6})$/i.exec(value);

  if (hex === null) {
    throw new Error(`${name} resolves to ${value}, not an opaque #rrggbb colour`);
  }

  return [0, 2, 4].map((offset) => Number.parseInt(hex[1]!.slice(offset, offset + 2), 16)) as [number, number, number];
}

function luminance(name: string): number {
  const [r, g, b] = rgb(name).map((channel) => {
    const c = channel / 255;

    return c <= 0.040_45 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];

  return (light + 0.05) / (dark + 0.05);
}

/** The surfaces dark-mode text sits on: page, window, well, cards and raised controls. */
const SURFACES = ["--adw-page-beige-bg", "--background", "--site-section-well-bg", "--card", "--popover", "--secondary"];

const TEXT_PAIRS: [foreground: string, backgrounds: string[]][] = [
  ["--foreground", [...SURFACES, "--muted", "--accent"]],
  ["--card-foreground", ["--card"]],
  ["--popover-foreground", ["--popover"]],
  ["--secondary-foreground", ["--secondary"]],
  ["--accent-foreground", ["--accent"]],
  ["--muted-foreground", [...SURFACES, "--muted"]],
  // Strong text (headings) and the muted shades components use directly in dark mode.
  ["--adw-light-1", SURFACES],
  ["--adw-light-2", [...SURFACES, "--adw-dark-3"]],
  ["--adw-light-4", SURFACES],
  ["--adw-light-5", SURFACES],
  ["--adw-toc-inactive", SURFACES],
  ["--adw-accent-color", SURFACES],
  ["--adw-destructive-color", SURFACES],
  ["--adw-success-color", SURFACES],
  ["--adw-warning-color", SURFACES],
  ["--adw-error-color", SURFACES],
  // Filled controls.
  ["--primary-foreground", ["--primary"]],
  ["--destructive-foreground", ["--destructive"]],
  ["--success-foreground", ["--success"]],
  ["--error-foreground", ["--error"]],
  // Inverted surfaces (logo, black call-to-action buttons, the floating-nav indicator, tag badges).
  ["--adw-dark-5", ["--adw-light-1"]],
];

const NON_TEXT_PAIRS: [foreground: string, backgrounds: string[]][] = [
  ["--ring", SURFACES],
  ["--input", ["--adw-page-beige-bg", "--background", "--site-section-well-bg", "--card"]],
  // An inverted button's light fill is its boundary.
  ["--adw-light-1", ["--adw-page-beige-bg", "--background", "--site-section-well-bg"]],
];

describe("dark theme palette (index.css .dark)", () => {
  for (const [foreground, backgrounds] of TEXT_PAIRS) {
    for (const background of backgrounds) {
      test(`${foreground} on ${background} meets AA for text`, () => {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(AA_TEXT);
      });
    }
  }

  for (const [foreground, backgrounds] of NON_TEXT_PAIRS) {
    for (const background of backgrounds) {
      test(`${foreground} against ${background} meets AA for UI boundaries`, () => {
        expect(contrast(foreground, background)).toBeGreaterThanOrEqual(AA_NON_TEXT);
      });
    }
  }

  test("gives every surface a warm (red over blue) tint", () => {
    for (const surface of [...SURFACES, "--muted", "--accent", "--adw-dark-5", "--adw-light-1"]) {
      const [red, , blue] = rgb(surface);

      expect({ surface, warm: red > blue }).toEqual({ surface, warm: true });
    }
  });

  test("names Flexoki, not Adwaita, as the palette in the header comment", () => {
    const header = css.slice(css.indexOf("Global Color Scheme"), css.indexOf("\n:root {"));

    expect(header).toContain("Flexoki");
    expect(header).toContain("https://stephango.com/flexoki");
    expect(header).not.toMatch(/Base palette: Adwaita/);
  });
});
