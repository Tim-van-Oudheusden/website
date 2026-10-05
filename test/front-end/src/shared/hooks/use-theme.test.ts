import { afterAll, beforeEach, beforeAll, describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type * as UseThemeModule from "../../../../../front-end/src/shared/hooks/use-theme";

import {
  uninstallFakeDom,
  triggerFakeMediaPreferenceChange,
  type FakeDocument,
} from "../../../src/test/fake-dom";
import {
  initFakeDomHarness,
  mountIntoBody,
  unmountFakeDomRoot,
  type FakeMount,
} from "../../../src/test/dom-harness";

// Module-loading boundary: react-dom captures `canUseDOM` at module load, so it
// must be imported after the fake DOM is installed by the harness.
let applyTheme: typeof UseThemeModule.applyTheme;
let ThemeProvider: typeof UseThemeModule.ThemeProvider;
let useTheme: typeof UseThemeModule.useTheme;

beforeAll(async () => {
  await initFakeDomHarness();
  const mod: typeof UseThemeModule = await import(
    "../../../../../front-end/src/shared/hooks/use-theme"
  );

  applyTheme = mod.applyTheme;
  ThemeProvider = mod.ThemeProvider;
  useTheme = mod.useTheme;
});

afterAll(() => {
  uninstallFakeDom();
});

// Shared fake-DOM state persists across files under the bunfig preload; give
// every test a deterministic light system preference.
beforeEach(() => {
  triggerFakeMediaPreferenceChange(false);
});

/** Probe child that reports the context theme and a way to set a new one. */
interface ProbeHandle {
  theme: () => string | null;
  setTheme: (theme: "light" | "dark" | "system") => void;
}

interface MountedProvider {
  mount: FakeMount;
  probe: ProbeHandle;
}

function mountThemeProvider(storedTheme: string | null): MountedProvider {
  if (storedTheme === null) {
    window.localStorage.removeItem("theme");
  } else {
    window.localStorage.setItem("theme", storedTheme);
  }

  let currentTheme: string | null = null;
  let setThemeFn: (theme: "light" | "dark" | "system") => void = () => undefined;

  function Probe(): null {
    const { theme, setTheme } = useTheme();

    currentTheme = theme;
    setThemeFn = setTheme;

    return null;
  }

  const mount = mountIntoBody(
    createElement(ThemeProvider, null, createElement(Probe)),
  );

  return {
    mount,
    probe: {
      theme: () => currentTheme,
      setTheme: (theme: "light" | "dark" | "system") => {
        setThemeFn(theme);
      },
    },
  };
}

function unmountProvider(mounted: MountedProvider): void {
  unmountFakeDomRoot(mounted.mount);
  window.localStorage.clear();
}

describe("applyTheme", () => {
  test("toggles the dark class on for an explicit dark theme", () => {
    const doc = document as unknown as FakeDocument;

    applyTheme("dark");

    expect(doc.documentElement.classList.contains("dark")).toBe(true);
  });

  test("toggles the dark class off for an explicit light theme", () => {
    const doc = document as unknown as FakeDocument;

    doc.documentElement.classList.add("dark");

    applyTheme("light");

    expect(doc.documentElement.classList.contains("dark")).toBe(false);
  });

  test("follows the system dark preference for the system theme", () => {
    const doc = document as unknown as FakeDocument;

    triggerFakeMediaPreferenceChange(true);
    applyTheme("system");
    expect(doc.documentElement.classList.contains("dark")).toBe(true);

    triggerFakeMediaPreferenceChange(false);
    applyTheme("system");
    expect(doc.documentElement.classList.contains("dark")).toBe(false);
  });
});

describe("ThemeProvider", () => {
  test("defaults to the light theme when nothing is stored", () => {
    const doc = document as unknown as FakeDocument;
    const mounted = mountThemeProvider(null);

    try {
      expect(mounted.probe.theme()).toBe("light");
      expect(doc.documentElement.classList.contains("dark")).toBe(false);
    } finally {
      unmountProvider(mounted);
    }
  });

  test("adopts a stored dark theme on mount", () => {
    const doc = document as unknown as FakeDocument;
    const mounted = mountThemeProvider("dark");

    try {
      expect(mounted.probe.theme()).toBe("dark");
      expect(doc.documentElement.classList.contains("dark")).toBe(true);
    } finally {
      unmountProvider(mounted);
    }
  });

  test("falls back to light for an unrecognized stored value", () => {
    const doc = document as unknown as FakeDocument;
    const mounted = mountThemeProvider("sepia");

    try {
      expect(mounted.probe.theme()).toBe("light");
      expect(doc.documentElement.classList.contains("dark")).toBe(false);
    } finally {
      unmountProvider(mounted);
    }
  });

  test("setTheme persists the choice and applies the dark class", async () => {
    const doc = document as unknown as FakeDocument;
    const mounted = mountThemeProvider(null);

    try {
      await act(async () => {
        mounted.probe.setTheme("dark");
        await Promise.resolve();
      });

      expect(mounted.probe.theme()).toBe("dark");
      expect(window.localStorage.getItem("theme")).toBe("dark");
      expect(doc.documentElement.classList.contains("dark")).toBe(true);
    } finally {
      unmountProvider(mounted);
    }
  });

  test("the system theme re-applies on media preference change", () => {
    const doc = document as unknown as FakeDocument;
    const mounted = mountThemeProvider("system");

    try {
      expect(doc.documentElement.classList.contains("dark")).toBe(false);

      triggerFakeMediaPreferenceChange(true);
      expect(doc.documentElement.classList.contains("dark")).toBe(true);

      triggerFakeMediaPreferenceChange(false);
      expect(doc.documentElement.classList.contains("dark")).toBe(false);
    } finally {
      unmountProvider(mounted);
    }
  });

  test("unmounting detaches the media preference listener", () => {
    const doc = document as unknown as FakeDocument;
    const mounted = mountThemeProvider("system");

    unmountProvider(mounted);
    doc.documentElement.classList.remove("dark");

    triggerFakeMediaPreferenceChange(true);
    expect(doc.documentElement.classList.contains("dark")).toBe(false);
  });
});
