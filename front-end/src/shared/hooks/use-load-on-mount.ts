import { useEffect, useReducer } from "react";

import { ApiError } from "@/shared/lib/api";

import type { ApiGetState } from "./use-api-get";
import { reduceApiGetState } from "./use-api-get";

function initialLoadingState<T>(): ApiGetState<T> {
  return { status: "loading", data: null, error: null };
}

/**
 * Runs `load` once on mount and tracks its loading/error/data state, for pages
 * that fetch their content up front. An `ApiError` shows its own message; any
 * other failure shows `fallbackError`, so transport details never reach the UI.
 *
 * `load` must be stable (module-level or memoised): a new function re-runs it.
 * A result that settles after unmount, or after `load` changed, is dropped.
 */
export function useLoadOnMount<T>(load: () => Promise<T>, fallbackError: string): ApiGetState<T> {
  const [state, dispatch] = useReducer(reduceApiGetState<T>, undefined, initialLoadingState);

  useEffect(() => {
    let cancelled = false;

    async function run(): Promise<void> {
      try {
        const data = await load();

        if (!cancelled) {
          dispatch({ type: "success", data });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          dispatch({ type: "error", error: err instanceof ApiError ? err.message : fallbackError });
        }
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [load, fallbackError]);

  return state;
}
