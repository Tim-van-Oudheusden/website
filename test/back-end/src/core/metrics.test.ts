import { afterEach, describe, expect, test } from "bun:test";

import { recordRequest, renderPrometheusMetrics, resetMetrics } from "../../../../back-end/src/core/metrics";

function bucketValues(body: string): Record<string, number> {
  const buckets: Record<string, number> = {};

  for (const match of body.matchAll(/^http_request_duration_seconds_bucket\{method="GET",route="\/x",le="([^"]+)"\} (\d+)$/gm)) {
    buckets[match[1]!] = Number(match[2]);
  }

  return buckets;
}

describe("renderPrometheusMetrics duration histogram", () => {
  afterEach(() => {
    resetMetrics();
  });

  test("reports each bucket as the number of requests at or below its bound", () => {
    recordRequest("GET", "/x", 200, 0.003);
    recordRequest("GET", "/x", 200, 0.3);

    const body = renderPrometheusMetrics();

    expect(bucketValues(body)).toEqual({
      "0.01": 1,
      "0.05": 1,
      "0.1": 1,
      "0.25": 1,
      "0.5": 2,
      "1": 2,
      "2.5": 2,
      "5": 2,
      "+Inf": 2,
    });

    expect(body).toContain("http_request_duration_seconds_count{method=\"GET\",route=\"/x\"} 2");
  });
});
