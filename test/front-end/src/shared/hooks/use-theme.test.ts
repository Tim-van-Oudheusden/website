import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";

import { act, createElement } from "react";

import type * as UseThemeModule from "../../../../../front-end/src/shared/hooks/use-theme";
import type { FakeMount } from "../../../src/test/dom-harness";
import { initFakeDomHarness, mountIntoBody, unmountFakeDomRoot } from "../../../src/test/dom-harness";
import type { FakeDocument } from "../../../src/test/fake-dom";
import { triggerFakeMediaPreferenceChange, uninstallFakeDom } from "../../../src/test/fake-dom";

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

  return mountProvider();
}

function mountProvider(): MountedProvider {
  let currentTheme: string | null = null;
  let setThemeFn: ((theme: "light" | "dark" | "system") => void) | null = null;

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
        setThemeFn?.(theme);
      },
    },
  };
}

function unmountProvider(mounted: MountedProvider): void {
  unmountFakeDomRoot(mounted.mount);
  window.localStorage.clear();
}

/**
 * Make every `localStorage` access throw, as a browser that denies the page
 * storage does: the property getter itself throws `SecurityError`. Returns a
 * function that restores the fake storage.
 */
function denyStorage(): () => void {
  const targets: object[] = [globalThis, window];
  const saved = targets.map((target) => Object.getOwnPropertyDescriptor(target, "localStorage"));

  for (const target of targets) {
    Object.defineProperty(target, "localStorage", {
      configurable: true,
      get: () => {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
  }

  return () => {
    targets.forEach((target, index) => {
      Object.defineProperty(target, "localStorage", saved[index]!);
    });
  };
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
  test("defaults to the system theme when nothing is stored, following the OS preference", () => {
    const doc = document as unknown as FakeDocument;

    triggerFakeMediaPreferenceChange(true);
    const mounted = mountThemeProvider(null);

    try {
      expect(mounted.probe.theme()).toBe("system");
      expect(doc.documentElement.classList.contains("dark")).toBe(true);

      triggerFakeMediaPreferenceChange(false);
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

  test("falls back to the system theme for an unrecognized stored value", () => {
    const doc = document as unknown as FakeDocument;

    triggerFakeMediaPreferenceChange(true);
    const mounted = mountThemeProvider("sepia");

    try {
      expect(mounted.probe.theme()).toBe("system");
      expect(doc.documentElement.classList.contains("dark")).toBe(true);
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

describe("ThemeProvider when the browser denies storage", () => {
  let restoreStorage: () => void;

  beforeEach(() => {
    restoreStorage = denyStorage();
  });

  afterEach(() => {
    restoreStorage();
  });

  test("renders with the system theme instead of throwing", () => {
    const doc = document as unknown as FakeDocument;

    triggerFakeMediaPreferenceChange(true);
    const mounted = mountProvider();

    try {
      expect(mounted.probe.theme()).toBe("system");
      expect(doc.documentElement.classList.contains("dark")).toBe(true);
    } finally {
      unmountFakeDomRoot(mounted.mount);
    }
  });

  test("setTheme still applies the picked theme for the visit", async () => {
    const doc = document as unknown as FakeDocument;
    const mounted = mountProvider();

    try {
      await act(async () => {
        mounted.probe.setTheme("dark");
        await Promise.resolve();
      });

      expect(mounted.probe.theme()).toBe("dark");
      expect(doc.documentElement.classList.contains("dark")).toBe(true);
    } finally {
      unmountFakeDomRoot(mounted.mount);
    }
  });
});
