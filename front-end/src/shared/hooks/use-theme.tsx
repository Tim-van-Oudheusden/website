import type { JSX, ReactNode } from "react";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";

type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
}>({
  theme: "light",
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

export function ThemeProvider({ children }: { children: ReactNode }): JSX.Element {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return "light";
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
