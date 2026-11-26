import type { JSX } from "react";

interface HomeLoadSlotProps<T> {
  /** `null` while the load is pending. */
  data: T | null;
  loadError: boolean;
  /** Announced through `role="alert"` when the load failed. */
  errorMessage: string;
  /** Read to screen readers while the load is pending. */
  loadingMessage: string;
  /** Shown while the load is pending, at the loaded content's size so nothing below it moves when it resolves. */
  skeleton: JSX.Element;
  children: (data: T) => JSX.Element;
}

/** The slot below a home section heading that loads content: error note, loading skeleton, or the loaded content. */
export function HomeLoadSlot<T>({
  data,
  loadError,
  errorMessage,
  loadingMessage,
  skeleton,
  children,
}: HomeLoadSlotProps<T>): JSX.Element {
  if (loadError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {errorMessage}
      </p>
    );
  }

  if (data === null) {
    return (
      <div>
        <p className="sr-only">{loadingMessage}</p>
        <div aria-hidden="true">{skeleton}</div>
      </div>
    );
  }

  return children(data);
}
