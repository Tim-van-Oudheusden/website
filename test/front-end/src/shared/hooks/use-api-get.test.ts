import { describe, expect, test } from "bun:test";
import {
  initialApiGetState,
  reduceApiGetState,
} from "../../../../../front-end/src/shared/hooks/use-api-get";

interface HelloData {
  message: string;
  timestamp: string;
}

describe("useApiGet state machine", () => {
  test("starts idle with no data or error", () => {
    expect(initialApiGetState<HelloData>()).toEqual({ status: "idle", data: null, error: null });
  });

  test("transitions to loading on start, clearing prior data and error", () => {
    const loading = reduceApiGetState(
      { status: "success", data: { message: "old", timestamp: "t" }, error: null },
      { type: "start" },
    );

    expect(loading).toEqual({ status: "loading", data: null, error: null });
  });

  test("transitions loading -> success carrying the fetched data", () => {
    const data = { message: "hello", timestamp: "2026-01-01T00:00:00Z" };

    const success = reduceApiGetState(
      { status: "loading", data: null, error: null },
      { type: "success", data },
    );

    expect(success).toEqual({ status: "success", data, error: null });
  });

  test("transitions loading -> error carrying a message", () => {
    const failure = reduceApiGetState(
      { status: "loading", data: null, error: null },
      { type: "error", error: "Failed to reach back-end" },
    );

    expect(failure).toEqual({ status: "error", data: null, error: "Failed to reach back-end" });
  });
});