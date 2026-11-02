import { useEffect, useReducer } from "react";

import { apiGet } from "@/shared/lib/api";

export type PollingApiGetStatus = "loading" | "success" | "error";

export interface PollingApiGetState<T> {
  status: PollingApiGetStatus;
  data: T | null;
  error: string | null;
  /** True when `data` is from an earlier poll and the latest poll failed. */
  stale: boolean;
}

export type PollingApiGetAction<T>
  = | { type: "success"; data: T }
    | { type: "error"; error: string };

export function initialPollingApiGetState<T>(): PollingApiGetState<T> {
  return { status: "loading", data: null, error: null, stale: false };
}

/**
 * Pure state machine for a polled GET. Unlike `reduceApiGetState`, a failed
 * poll keeps the last good data on screen and marks it stale.
 */
export function reducePollingApiGetState<T>(
  state: PollingApiGetState<T>,
  action: PollingApiGetAction<T>,
): PollingApiGetState<T> {
  switch (action.type) {
    case "success":
      return { status: "success", data: action.data, error: null, stale: false };
    case "error":
      return { status: "error", data: state.data, error: action.error, stale: state.data !== null };
  }
}

function resolveErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  return "Failed to reach back-end";
}

export interface PollingOptions {
  /** Time between polls while the tab is visible. */
  intervalMs: number;
}

/** Poll once a minute (metrics spec, "Freshness and failure"). */
export const DEFAULT_POLLING_OPTIONS: PollingOptions = { intervalMs: 60_000 };

/**
 * GETs `path` on mount, then every `intervalMs` (60 s by default) while the
 * tab is visible; polling pauses while it is hidden. When the tab becomes
 * visible again it fetches at once if the last fetch started more than
 * `intervalMs` ago, else at the time that fetch's next poll was due.
 *
 * A failed poll keeps the last data and marks it `stale`. Responses that
 * arrive after unmount, or after a newer poll started, are dropped.
 */
export function usePollingApiGet<T>(
  path: string,
  { intervalMs }: PollingOptions = DEFAULT_POLLING_OPTIONS,
): PollingApiGetState<T> {
  const [state, dispatch] = useReducer(reducePollingApiGetState<T>, undefined, initialPollingApiGetState);

  useEffect(() => {
    let lastStartedAt = 0;
    let latestRequest = 0;
    let timer: number | null = null;

    /** Dispatches only while `request` is the newest one and the hook is mounted. */
    async function fetchOnce(request: number): Promise<void> {
      let action: PollingApiGetAction<T>;

      try {
        action = { type: "success", data: await apiGet<T>(path) };
      } catch (err: unknown) {
        action = { type: "error", error: resolveErrorMessage(err) };
      }

      if (request === latestRequest) {
        dispatch(action);
      }
    }

    function poll(): void {
      lastStartedAt = Date.now();
      latestRequest += 1;
      void fetchOnce(latestRequest);
    }

    function cancelNextPoll(): void {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    }

    function scheduleNextPoll(delayMs: number): void {
      cancelNextPoll();

      timer = window.setTimeout(() => {
        timer = null;
        poll();
        scheduleNextPoll(intervalMs);
      }, delayMs);
    }

    function onVisibilityChange(): void {
      if (document.visibilityState !== "visible") {
        cancelNextPoll();

        return;
      }

      const elapsed = Date.now() - lastStartedAt;

      if (elapsed > intervalMs) {
        poll();
        scheduleNextPoll(intervalMs);
      } else {
        scheduleNextPoll(intervalMs - elapsed);
      }
    }

    poll();
    onVisibilityChange();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      cancelNextPoll();
      // Supersede any in-flight request so its response is dropped after unmount.
      latestRequest += 1;
    };
  }, [path, intervalMs]);

  return state;
}
