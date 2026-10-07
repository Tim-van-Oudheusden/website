import type { Locator } from "@playwright/test";

export type Rgb = [number, number, number];

interface TextSample {
  text: string;
  color: Rgb;
  backdrop: Rgb;
}

export interface SurfaceSample {
  /** What the surface element itself is painted on (its own background included). */
  backdrop: Rgb;
  /** What each `<h3>` inside the surface is painted on. */
  headingBackdrops: Rgb[];
  /** Every visible piece of text inside the surface, with the colour it is painted on. */
  texts: TextSample[];
  /** The surface's own outline colour, painted over what surrounds the surface. */
  outline: Rgb;
  /**
   * The surface's outermost ring (a spread-only `box-shadow`, as Tailwind `ring-*` draws it), painted over what
   * surrounds the surface; null when it draws none.
   */
  ring: Rgb | null;
  /** What surrounds the surface: its parent's backdrop, where an outline is drawn. */
  surround: Rgb;
}

/** WCAG 2.2 SC 1.4.3 Contrast (Minimum), AA, for text below large-scale size. */
const AA_TEXT_CONTRAST = 4.5;

/** WCAG 2.2 SC 1.4.11 Non-text Contrast, for UI component states such as focus indicators. */
export const AA_NON_TEXT_CONTRAST = 3;

/**
 * Samples the colours a surface really shows once its colour transitions settle: every background from the
 * page root down is composited (and text colour on top of that, scaled by opacity) on a 1px canvas, so
 * translucent layers count.
 */
export async function sampleSurface(surface: Locator): Promise<SurfaceSample> {
  return surface.evaluate(async (root): Promise<SurfaceSample> => {
    const transitions = root.getAnimations({ subtree: true }).filter((animation) => animation instanceof CSSTransition);

    await Promise.all(transitions.map(async (transition) => transition.finished));

    const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true });

    if (context === null) {
      throw new Error("No 2D canvas context");
    }

    const ctx: CanvasRenderingContext2D = context;

    function paint(color: string, alpha = 1): void {
      const sentinel = "#010203";

      ctx.fillStyle = sentinel;
      ctx.fillStyle = color;

      if (ctx.fillStyle === sentinel && color !== sentinel) {
        throw new Error(`Canvas cannot parse colour ${color}`);
      }

      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, 1, 1);
      ctx.globalAlpha = 1;
    }

    function pixel(): Rgb {
      const [r = 0, g = 0, b = 0] = ctx.getImageData(0, 0, 1, 1).data;

      return [r, g, b];
    }

    /** The element and its ancestors, outermost first. */
    function lineage(element: Element): Element[] {
      const chain: Element[] = [];

      for (let node: Element | null = element; node !== null; node = node.parentElement) {
        chain.unshift(node);
      }

      return chain;
    }

    function paintBackdrop(element: Element): void {
      paint("#ffffff");

      for (const node of lineage(element)) {
        paint(getComputedStyle(node).backgroundColor);
      }
    }

    function backdropOf(element: Element): Rgb {
      paintBackdrop(element);

      return pixel();
    }

    const texts: TextSample[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

    for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
      const parent = node.parentElement;
      const text = node.textContent?.trim() ?? "";

      if (parent === null || text === "" || !parent.checkVisibility()) {
        continue;
      }

      const backdrop = backdropOf(parent);
      const opacity = lineage(parent).reduce((total, element) => total * Number(getComputedStyle(element).opacity), 1);

      paintBackdrop(parent);
      paint(getComputedStyle(parent).color, opacity);
      texts.push({ text, color: pixel(), backdrop });
    }

    const surroundingElement = root.parentElement ?? root;

    paintBackdrop(surroundingElement);
    paint(getComputedStyle(root).outlineColor);

    const outline = pixel();

    // Shadows split on the commas between them, not those inside a colour; inset shadows never match.
    const shadows = getComputedStyle(root).boxShadow.split(/,(?![^(]*\))/);
    let ring: Rgb | null = null;
    let ringSpread = 0;

    for (const shadow of shadows) {
      const match = /^(.+?) (-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px (-?[\d.]+)px$/.exec(shadow.trim());

      if (match === null) {
        continue;
      }

      const [, color = "", x, y, blur, spread] = match;

      if (Number(x) !== 0 || Number(y) !== 0 || Number(blur) !== 0 || Number(spread) <= ringSpread) {
        continue;
      }

      paintBackdrop(surroundingElement);
      paint(color);
      ring = pixel();
      ringSpread = Number(spread);
    }

    return {
      backdrop: backdropOf(root),
      headingBackdrops: [...root.querySelectorAll("h3")].map(backdropOf),
      texts,
      outline,
      ring,
      surround: backdropOf(surroundingElement),
    };
  });
}

function relativeLuminance([r, g, b]: Rgb): number {
  function linear(channel: number): number {
    const srgb = channel / 255;

    return srgb <= 0.040_45 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  }

  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2.2 contrast ratio, (L1 + 0.05) / (L2 + 0.05). */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [lighter, darker] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];

  return (lighter + 0.05) / (darker + 0.05);
}

/** Every text in the sample below WCAG AA, as `"text" (ratio:1)`; empty when all of it passes. */
export function lowContrastTexts(sample: SurfaceSample): string[] {
  return sample.texts
    .map(({ text, color, backdrop }) => ({ text, ratio: contrastRatio(color, backdrop) }))
    .filter(({ ratio }) => ratio < AA_TEXT_CONTRAST)
    .map(({ text, ratio }) => `"${text}" (${ratio.toFixed(2)}:1)`);
}
