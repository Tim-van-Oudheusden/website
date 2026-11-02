/**
 * The Flexoki palette by Steph Ango (MIT), the base palette of every Agentic design: the base ramp and the extended
 * scale of each of its eight accent hues.
 *
 * Source: https://github.com/kepano/flexoki/blob/main/css/flexoki.css
 */

export const FLEXOKI_BASE = {
  paper: "#fffcf0",
  50: "#f2f0e5",
  100: "#e6e4d9",
  150: "#dad8ce",
  200: "#cecdc3",
  300: "#b7b5ac",
  400: "#9f9d96",
  500: "#878580",
  600: "#6f6e69",
  700: "#575653",
  800: "#403e3c",
  850: "#343331",
  900: "#282726",
  950: "#1c1b1a",
  black: "#100f0f",
} as const;

export type FlexokiBaseStep = keyof typeof FLEXOKI_BASE;

export type FlexokiShade = "50" | "100" | "150" | "200" | "300" | "400" | "500" | "600" | "700" | "800" | "850"
  | "900" | "950";

export type FlexokiHue = "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "magenta";

export const FLEXOKI_HUES: Readonly<Record<FlexokiHue, Readonly<Record<FlexokiShade, string>>>> = {
  red: {
    50: "#ffe1d5", 100: "#ffcabb", 150: "#fdb2a2", 200: "#f89a8a", 300: "#e8705f", 400: "#d14d41", 500: "#c03e35",
    600: "#af3029", 700: "#942822", 800: "#6c201c", 850: "#551b18", 900: "#3e1715", 950: "#261312",
  },
  orange: {
    50: "#ffe7ce", 100: "#fed3af", 150: "#fcc192", 200: "#f9ae77", 300: "#ec8b49", 400: "#da702c", 500: "#cb6120",
    600: "#bc5215", 700: "#9d4310", 800: "#71320d", 850: "#59290d", 900: "#40200d", 950: "#27180e",
  },
  yellow: {
    50: "#faeec6", 100: "#f6e2a0", 150: "#f1d67e", 200: "#eccb60", 300: "#dfb431", 400: "#d0a215", 500: "#be9207",
    600: "#ad8301", 700: "#8e6b01", 800: "#664d01", 850: "#503d02", 900: "#3a2d04", 950: "#241e08",
  },
  green: {
    50: "#edeecf", 100: "#dde2b2", 150: "#cdd597", 200: "#bec97e", 300: "#a0af54", 400: "#879a39", 500: "#768d21",
    600: "#66800b", 700: "#536907", 800: "#3d4c07", 850: "#313d07", 900: "#252d09", 950: "#1a1e0c",
  },
  cyan: {
    50: "#ddf1e4", 100: "#bfe8d9", 150: "#a2dece", 200: "#87d3c3", 300: "#5abdac", 400: "#3aa99f", 500: "#2f968d",
    600: "#24837b", 700: "#1c6c66", 800: "#164f4a", 850: "#143f3c", 900: "#122f2c", 950: "#101f1d",
  },
  blue: {
    50: "#e1eceb", 100: "#c6dde8", 150: "#abcfe2", 200: "#92bfdb", 300: "#66a0c8", 400: "#4385be", 500: "#3171b2",
    600: "#205ea6", 700: "#1a4f8c", 800: "#163b66", 850: "#133051", 900: "#12253b", 950: "#101a24",
  },
  purple: {
    50: "#f0eaec", 100: "#e2d9e9", 150: "#d3cae6", 200: "#c4b9e0", 300: "#a699d0", 400: "#8b7ec8", 500: "#735eb5",
    600: "#5e409d", 700: "#4f3685", 800: "#3c2a62", 850: "#31234e", 900: "#261c39", 950: "#1a1623",
  },
  magenta: {
    50: "#fee4e5", 100: "#fccfda", 150: "#f9b9cf", 200: "#f4a4c2", 300: "#e47da8", 400: "#ce5d97", 500: "#b74583",
    600: "#a02f6f", 700: "#87285e", 800: "#641f46", 850: "#4f1b39", 900: "#39172b", 950: "#24131d",
  },
};

export type ColourTheme = "light" | "dark";

/**
 * The surfaces an Agentic design may put text and graphs on, per theme: Flexoki's `bg` and `bg-2` (paper and base-50
 * in light, black and base-950 in dark) plus base-900, the site's dark wells.
 */
export const FLEXOKI_SURFACES: Readonly<Record<ColourTheme, readonly string[]>> = {
  light: [FLEXOKI_BASE.paper, FLEXOKI_BASE["50"]],
  dark: [FLEXOKI_BASE.black, FLEXOKI_BASE["950"], FLEXOKI_BASE["900"]],
};

/** WCAG 2.2 relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map((channel) => (
    channel <= 0.040_45 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));

  return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
}

/** WCAG 2.2 contrast ratio between two `#rrggbb` colours, from 1 to 21. */
export function contrastRatio(first: string, second: string): number {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);

  return ((lighter ?? 0) + 0.05) / ((darker ?? 0) + 0.05);
}
