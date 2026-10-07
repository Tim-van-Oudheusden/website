// The README screenshots that scripts/readme-screenshots.ts captures. Pure data
// and validation only, so the plan is testable without a browser.
import { posix } from "node:path";

/** Repo-relative directory the README embeds its screenshots from. */
export const README_ASSETS_DIR = "docs/assets/readme";

const THEMES = ["light", "dark"] as const;

/** A theme the capture can pin: "system" would follow the capturing host. */
export type ScreenshotTheme = (typeof THEMES)[number];

export interface Viewport {
  width: number;
  height: number;
}

export interface CaptureInput {
  /** File name, relative to the README assets directory. */
  file: string;
  theme: string;
  viewport: Viewport;
  deviceScaleFactor: number;
}

export interface Capture {
  /** Repo-relative output path, always inside README_ASSETS_DIR. */
  output: string;
  theme: ScreenshotTheme;
  viewport: Viewport;
  deviceScaleFactor: number;
}

function isScreenshotTheme(theme: string): theme is ScreenshotTheme {
  return (THEMES as readonly string[]).includes(theme);
}

/**
 * Validate one capture; throws on a theme the page would not render
 * deterministically, or on a file that would land outside README_ASSETS_DIR.
 */
export function defineCapture(input: CaptureInput): Capture {
  const { file, theme, viewport, deviceScaleFactor } = input;

  if (!isScreenshotTheme(theme)) {
    throw new Error(`Unknown screenshot theme "${theme}"; expected one of: ${THEMES.join(", ")}`);
  }

  const output = posix.join(README_ASSETS_DIR, file);

  if (posix.isAbsolute(file) || !output.startsWith(`${README_ASSETS_DIR}/`)) {
    throw new Error(`Screenshot file "${file}" must resolve to a file inside ${README_ASSETS_DIR}/`);
  }

  return { output, theme, viewport, deviceScaleFactor };
}

const HOME_VIEWPORT: Viewport = { width: 1280, height: 800 };

export const README_CAPTURES: readonly Capture[] = [
  defineCapture({ file: "home-light.png", theme: "light", viewport: HOME_VIEWPORT, deviceScaleFactor: 1 }),
  defineCapture({ file: "home-dark.png", theme: "dark", viewport: HOME_VIEWPORT, deviceScaleFactor: 1 }),
  // GitHub's recommended social preview size.
  defineCapture({ file: "social-preview.png", theme: "light", viewport: { width: 1280, height: 640 }, deviceScaleFactor: 1 }),
];
