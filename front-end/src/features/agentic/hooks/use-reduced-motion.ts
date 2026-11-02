import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);

  query.addEventListener("change", onChange);

  return () => {
    query.removeEventListener("change", onChange);
  };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Whether the visitor asks for reduced motion; follows changes to the setting. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, prefersReducedMotion, () => true);
}
