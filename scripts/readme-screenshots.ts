#!/usr/bin/env bun
// Capture the README's home-page screenshots and the repo's social preview.
//
// Usage (dev pod up first, see scripts/dev.sh):
//   bun run screenshots:readme
//
// Opens E2E_BASE_URL (default http://localhost:5173) at "/" once per capture in
// scripts/readme-screenshot-plan.ts: pins the theme in localStorage, reloads,
// waits for fonts and network to settle, and writes the PNG under
// docs/assets/readme/. Exits non-zero if the site cannot be reached or a
// capture fails. Manual only: there is no CI job.
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

import { chromium } from "@playwright/test";

import { README_CAPTURES } from "./readme-screenshot-plan";

const rootPath = resolve(import.meta.dir, "..");
const homeUrl = new URL("/", process.env["E2E_BASE_URL"] ?? "http://localhost:5173").href;

const browser = await chromium.launch();

try {
  for (const capture of README_CAPTURES) {
    const context = await browser.newContext({
      viewport: capture.viewport,
      deviceScaleFactor: capture.deviceScaleFactor,
      colorScheme: capture.theme,
    });

    const page = await context.newPage();
    const response = await page.goto(homeUrl, { waitUntil: "networkidle" });

    if (!response?.ok()) {
      throw new Error(`${homeUrl} answered ${response === null ? "nothing" : String(response.status())}`);
    }

    await page.evaluate((theme) => {
      localStorage.setItem("theme", theme);
    }, capture.theme);

    await page.reload({ waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);

    const isDark = await page.evaluate(() => document.documentElement.classList.contains("dark"));

    if (isDark !== (capture.theme === "dark")) {
      throw new Error(`${capture.output}: page did not apply the ${capture.theme} theme`);
    }

    const outputPath = resolve(rootPath, capture.output);

    mkdirSync(dirname(outputPath), { recursive: true });
    // "disabled" finishes finite animations and cancels infinite ones, so the
    // frame does not depend on when the shot is taken.
    await page.screenshot({ path: outputPath, animations: "disabled", caret: "hide" });
    await context.close();
    process.stdout.write(`wrote ${capture.output}\n`);
  }
} catch (error) {
  console.error(`readme-screenshots: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  await browser.close();
}
