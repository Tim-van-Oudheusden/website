import type { JSX, ReactNode } from "react";
import { createContext, use, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

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

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";

function systemPrefersDark(): boolean {
  return window.matchMedia(DARK_SCHEME_QUERY).matches;
}

function subscribeToSystemScheme(onChange: () => void): () => void {
  const query = window.matchMedia(DARK_SCHEME_QUERY);

  query.addEventListener("change", onChange);

  return () => {
    query.removeEventListener("change", onChange);
  };
}

/** Toggle the document-level theme class for the given theme selection. */
export function applyTheme(theme: Theme): void {
  document.documentElement.classList.toggle("dark", theme === "dark" || (theme === "system" && systemPrefersDark()));
}

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return DEFAULT_THEME;
  });

  const persistTheme = useCallback((next: Theme): void => {
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }, []);
  const contextValue = useMemo(() => ({ theme, setTheme: persistTheme }), [theme, persistTheme]);

  useEffect(() => {
    applyTheme(theme);

    if (theme !== "system") {
      return;
    }

    return subscribeToSystemScheme(() => {
      applyTheme("system");
    });
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

/** The theme on screen: the visitor's choice, with "system" resolved to the OS preference (and following it). */
export function useResolvedTheme(): "light" | "dark" {
  const { theme } = useTheme();
  const systemDark = useSyncExternalStore(subscribeToSystemScheme, systemPrefersDark, () => false);

  return theme === "dark" || (theme === "system" && systemDark) ? "dark" : "light";
}
