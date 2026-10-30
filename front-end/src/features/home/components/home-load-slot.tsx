import type { JSX } from "react";

interface HomeLoadSlotProps<T> {
  /** `null` while the load is pending. */
  data: T | null;
  loadError: boolean;
  /** Announced through `role="alert"` when the load failed. */
  errorMessage: string;
  loadingMessage: string;
  children: (data: T) => JSX.Element;
}

/** The slot below a home section heading that loads content: error note, loading note, or the loaded content. */
export function HomeLoadSlot<T>({
  data,
  loadError,
  errorMessage,
  loadingMessage,
  children,
}: HomeLoadSlotProps<T>): JSX.Element {
  if (loadError) {
    return (
      <p role="alert" className="text-sm text-red-600 dark:text-destructive">
        {errorMessage}
      </p>
    );
  }

  if (data === null) {
    return <p className="text-sm text-(--ink-5)/60 dark:text-white/60">{loadingMessage}</p>;
  }

  return children(data);
}
