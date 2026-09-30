import { describe, expect, test } from "bun:test";
import { applyTheme } from "../../../../../front-end/src/shared/hooks/use-theme";

const ORIGINAL_DOCUMENT = globalThis.document;
const ORIGINAL_WINDOW = globalThis.window;

interface EnvironmentStubs {
  classToggleCalls: [string, boolean][];
  restore: () => void;
}

/**
 * Stub the browser globals `applyTheme` reads so the dark-class toggle is
 * observable without a DOM. `matchMedia` reports the system preference.
 */
function stubEnvironment(darkSystemPreference: boolean): EnvironmentStubs {
  const classToggleCalls: [string, boolean][] = [];
  const classList = {
    toggle: (className: string, force: boolean): void => { classToggleCalls.push([className, force]); },
  };
  const matchMedia = (query: string): MediaQueryList => ({
    matches: darkSystemPreference,
    media: query,
    onchange: null,
    addListener: (): void => undefined,
    removeListener: (): void => undefined,
    addEventListener: (): void => undefined,
    removeEventListener: (): void => undefined,
    dispatchEvent: () => false,
  });

  Object.defineProperty(globalThis, "document", {
    value: { documentElement: { classList } },
    configurable: true,
  });
  Object.defineProperty(globalThis, "window", {
    value: { matchMedia },
    configurable: true,
  });

  return {
    classToggleCalls,
    restore: () => {
      Object.defineProperty(globalThis, "document", { value: ORIGINAL_DOCUMENT, configurable: true });
      Object.defineProperty(globalThis, "window", { value: ORIGINAL_WINDOW, configurable: true });
    },
  };
}

describe("applyTheme", () => {
  test("toggles the dark class on for an explicit dark theme", () => {
    const { classToggleCalls, restore } = stubEnvironment(false);
    try {
      applyTheme("dark");
    } finally {
      restore();
    }

    expect(classToggleCalls).toEqual([["dark", true]]);
  });

  test("toggles the dark class off for an explicit light theme", () => {
    const { classToggleCalls, restore } = stubEnvironment(true);
    try {
      applyTheme("light");
    } finally {
      restore();
    }

    expect(classToggleCalls).toEqual([["dark", false]]);
  });

  test("follows the system dark preference for the system theme", () => {
    const darkEnvironment = stubEnvironment(true);
    applyTheme("system");
    const darkCalls = darkEnvironment.classToggleCalls;
    darkEnvironment.restore();

    const lightEnvironment = stubEnvironment(false);
    applyTheme("system");
    const lightCalls = lightEnvironment.classToggleCalls;
    lightEnvironment.restore();

    expect(darkCalls).toEqual([["dark", true]]);
    expect(lightCalls).toEqual([["dark", false]]);
  });
});