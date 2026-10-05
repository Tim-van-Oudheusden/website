import { useCallback, useReducer } from "react";
import { apiGet } from "@/shared/lib/api";

export type ApiGetStatus = "idle" | "loading" | "success" | "error";

export interface ApiGetState<T> {
  status: ApiGetStatus;
  data: T | null;
  error: string | null;
}

export type ApiGetAction<T>
  = | { type: "start" }
    | { type: "success"; data: T }
    | { type: "error"; error: string };

export function initialApiGetState<T>(): ApiGetState<T> {
  return { status: "idle", data: null, error: null };
}

/**
 * Pure state machine for a single-shot GET lifecycle.
 *
 * `start` clears any prior result so a refetch never shows a stale success or
 * error while the new request is in flight.
 */
export function reduceApiGetState<T>(
  _state: ApiGetState<T>,
  action: ApiGetAction<T>,
): ApiGetState<T> {
  switch (action.type) {
    case "start":
      return { status: "loading", data: null, error: null };
    case "success":
      return { status: "success", data: action.data, error: null };
    case "error":
      return { status: "error", data: null, error: action.error };
  }
}

function resolveErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return "Failed to reach back-end";
}

export interface UseApiGetResult<T> {
  status: ApiGetStatus;
  data: T | null;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Minimal GET lifecycle hook: drives the loading/error/data state machine
 * around a single `apiGet` call so components keep their fetch wiring thin.
 */
export function useApiGet<T>(path: string): UseApiGetResult<T> {
  const [state, dispatch] = useReducer(reduceApiGetState<T>, undefined, initialApiGetState);

  const refetch = useCallback(async () => {
    dispatch({ type: "start" });

    try {
      const data = await apiGet<T>(path);

      dispatch({ type: "success", data });
    } catch (err: unknown) {
      dispatch({ type: "error", error: resolveErrorMessage(err) });
    }
  }, [path]);

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    refetch,
  };
}
