import { useEffect, useState } from "react";

import { ApiError } from "@/shared/lib/api";

import type { ApiGetState } from "./use-api-get";

const LOADING: ApiGetState<never> = { status: "loading", data: null, error: null };
const IDLE: ApiGetState<never> = { status: "idle", data: null, error: null };

interface Settled<T> {
  /** The `load` this outcome belongs to, so an outcome is never read for another load. */
  load: () => Promise<T>;
  outcome: ApiGetState<T>;
}

/**
 * Runs `load` on mount and tracks its loading/error/data state, for pages
 * that fetch their content up front. An `ApiError` shows its own message; any
 * other failure shows `fallbackError`, so transport details never reach the UI.
 *
 * `load` must be stable (module-level or memoised): a new function re-runs it,
 * and the state reads as loading from that very render. `null` means there is
 * nothing to load yet and the state stays idle. A result that settles after
 * unmount, or after `load` changed, is dropped.
 */
export function useLoadOnMount<T>(load: (() => Promise<T>) | null, fallbackError: string): ApiGetState<T> {
  const [settled, setSettled] = useState<Settled<T> | null>(null);

  useEffect(() => {
    if (load === null) {
      return;
    }

    const currentLoad = load;
    let cancelled = false;

    async function run(): Promise<void> {
      let outcome: ApiGetState<T>;

      try {
        outcome = { status: "success", data: await currentLoad(), error: null };
      } catch (err: unknown) {
        outcome = { status: "error", data: null, error: err instanceof ApiError ? err.message : fallbackError };
      }

      if (!cancelled) {
        setSettled({ load: currentLoad, outcome });
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [load, fallbackError]);

  if (load === null) {
    return IDLE;
  }

  return settled?.load === load ? settled.outcome : LOADING;
}
