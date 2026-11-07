import type { JSX, ReactNode } from "react";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";
// Used when nothing valid is stored: follow the visitor's OS preference.
const DEFAULT_THEME: Theme = "system";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: DEFAULT_THEME,
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  setTheme: () => {},
});

/** Toggle the document-level theme class for the given theme selection. */
export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  const isDark
    = theme === "dark"
      || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  root.classList.toggle("dark", isDark);
}

// Storage is optional: a browser can deny it to the page, and then even the
// `localStorage` property read throws. The theme is only a preference, not
// worth the page, so storage failures fall back to the default theme.
function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // Storage denied: use the default below.
  }

  return DEFAULT_THEME;
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);

  const persistTheme = useCallback((next: Theme): void => {
    setTheme(next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage denied or full: the theme still applies for this visit.
    }
  }, []);
  const contextValue = useMemo(() => ({ theme, setTheme: persistTheme }), [theme, persistTheme]);

  useEffect(() => {
    applyTheme(theme);

    if (theme !== "system") {
      return;
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    function onChange(): void {
      applyTheme("system");
    }

    mq.addEventListener("change", onChange);

    return () => {
      mq.removeEventListener("change", onChange);
    };
  }, [theme]);

  return (
    <ThemeContext value={contextValue}>
      {children}
    </ThemeContext>
  );
}

export function useTheme(): { theme: Theme; setTheme: (theme: Theme) => void } {
  return use(ThemeContext);
}
