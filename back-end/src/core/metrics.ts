/**
 * In-process request metrics, exposed in Prometheus text format.
 *
 * No exporter, no external data flow: counters live in memory for the life
 * of the process and are only ever read back by the local `/metrics` route.
 * Labels use the matched route *pattern* (e.g. `/api/content/:slug`), not the
 * raw request path, so cardinality stays bounded regardless of how many
 * distinct slugs or query strings callers send.
 */

const DURATION_BUCKETS_SECONDS = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] as const;

interface CounterEntry {
  method: string;
  route: string;
  statusCode: number;
  value: number;
}

interface HistogramEntry {
  method: string;
  route: string;
  bucketCounts: number[];
  sum: number;
  count: number;
}

const requestCounts = new Map<string, CounterEntry>();
const requestDurations = new Map<string, HistogramEntry>();

function countKey(method: string, route: string, statusCode: number): string {
  return `${method}\u0000${route}\u0000${statusCode}`;
}

function histogramKey(method: string, route: string): string {
  return `${method}\u0000${route}`;
}

export function recordRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
  const existingCounter = requestCounts.get(countKey(method, route, statusCode));

  requestCounts.set(countKey(method, route, statusCode), {
    method,
    route,
    statusCode,
    value: (existingCounter?.value ?? 0) + 1,
  });

  const histogram = requestDurations.get(histogramKey(method, route)) ?? {
    method,
    route,
    bucketCounts: DURATION_BUCKETS_SECONDS.map(() => 0),
    sum: 0,
    count: 0,
  };

  histogram.bucketCounts = histogram.bucketCounts.map(
    (count, i) => (durationSeconds <= (DURATION_BUCKETS_SECONDS[i] ?? Infinity) ? count + 1 : count),
  );

  histogram.sum += durationSeconds;
  histogram.count += 1;
  requestDurations.set(histogramKey(method, route), histogram);
}

function escapeLabelValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\"", "\\\"");
}

export function renderPrometheusMetrics(): string {
  const lines: string[] = [];

  lines.push("# HELP http_requests_total Total HTTP requests handled, by method/route/status.");
  lines.push("# TYPE http_requests_total counter");

  for (const { method, route, statusCode, value } of requestCounts.values()) {
    lines.push(
      `http_requests_total{method="${escapeLabelValue(method)}",route="${escapeLabelValue(route)}",status="${statusCode}"} ${value}`,
    );
  }

  lines.push("# HELP http_request_duration_seconds Request duration in seconds, by method/route.");
  lines.push("# TYPE http_request_duration_seconds histogram");

  for (const { method, route, bucketCounts, sum, count } of requestDurations.values()) {
    const labels = `method="${escapeLabelValue(method)}",route="${escapeLabelValue(route)}"`;
    let cumulative = 0;

    for (let i = 0; i < DURATION_BUCKETS_SECONDS.length; i += 1) {
      cumulative += bucketCounts[i] ?? 0;
      lines.push(`http_request_duration_seconds_bucket{${labels},le="${DURATION_BUCKETS_SECONDS[i]}"} ${cumulative}`);
    }

    lines.push(`http_request_duration_seconds_bucket{${labels},le="+Inf"} ${count}`);
    lines.push(`http_request_duration_seconds_sum{${labels}} ${sum}`);
    lines.push(`http_request_duration_seconds_count{${labels}} ${count}`);
  }

  return `${lines.join("\n")}\n`;
}

/** Test-only: clears accumulated counters so suites don't leak state across cases. */
export function resetMetrics(): void {
  requestCounts.clear();
  requestDurations.clear();
}
