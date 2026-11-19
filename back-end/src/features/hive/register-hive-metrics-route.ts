import type { FastifyInstance } from "fastify";

import type { HiveMetricsResponse } from "shared";
import { HIVE_METRICS_STALE_AFTER_MS, ROUTES } from "shared";

import type { HiveConfig } from "../../core/server-config";

import type { ContributorHistory, ContributorHour } from "./contributor-history";
import { DEV_HIVE_METRICS } from "./hive-metrics-dev-fixture";
import { buildHivePublicMetrics, contributorHours } from "./hive-public-metrics";
import type { FetchLike, PartReading, UpstreamReadings } from "./hive-upstream";
import { createHiveUpstream, UPSTREAM_TIMEOUT_MS } from "./hive-upstream";
import { buildRepoPrActivity, windowStart } from "./repo-pr-activity";

/** Where the metrics come from, the network and clock to get them with, and where contributor hours are kept. */
export interface HiveMetricsRouteOptions {
  config: HiveConfig;
  fetch: FetchLike;
  now: () => Date;
  /** Closed with the app. */
  history: ContributorHistory;
}

const DAY_MS = 86_400_000;

const UNAVAILABLE: HiveMetricsResponse = { state: "unavailable", fetchedAt: null, metrics: null };

/**
 * The response from each part's last good answer. Parts that never answered are blank and do not affect `state`:
 * - `unavailable`: no part ever answered.
 * - `stale`: some shown answer was fetched more than `HIVE_METRICS_STALE_AFTER_MS` before `now`.
 * - `live`: every shown answer is at most that old.
 *
 * `fetchedAt` is the newest answer's fetch time.
 */
function respond(readings: UpstreamReadings, storedHours: readonly ContributorHour[], now: Date): HiveMetricsResponse {
  const parts = [readings.health, readings.widget, readings.contributeMetrics, readings.runStats, readings.pulls];
  const fetchedAt = parts
    .filter((part): part is PartReading => part !== undefined && part !== null)
    .map((part) => part.fetchedAt.getTime());

  if (fetchedAt.length === 0) {
    return UNAVAILABLE;
  }

  const isStale = now.getTime() - Math.min(...fetchedAt) > HIVE_METRICS_STALE_AFTER_MS;

  return {
    state: isStale ? "stale" : "live",
    fetchedAt: new Date(Math.max(...fetchedAt)).toISOString(),
    metrics: {
      ...buildHivePublicMetrics({
        health: readings.health?.value ?? null,
        widget: readings.widget?.value ?? null,
        contributeMetrics: readings.contributeMetrics?.value ?? null,
        runStats: readings.runStats?.value ?? null,
        storedHours,
      }),
      // The PR window ends when the pull list was fetched, so a kept answer is not shifted into a later window.
      repo: readings.pulls ? buildRepoPrActivity(readings.pulls.value, readings.pulls.fetchedAt) : null,
    },
  };
}

export function registerHiveMetricsRoute(app: FastifyInstance, options: HiveMetricsRouteOptions): void {
  const { config, now, history } = options;
  const upstream = createHiveUpstream({
    ...options,
    timeoutMs: UPSTREAM_TIMEOUT_MS,
    onUnavailable: (part, reason) => {
      app.log.warn({ part, reason }, "hive upstream unavailable");
    },
  });
  let recorded: PartReading | null = null;
  let storedHours: ContributorHour[] = [];

  /** Stores the hours of each new contributor answer once, and returns every stored hour. */
  function store(reading: PartReading | null | undefined): ContributorHour[] {
    if (reading !== undefined && reading !== null && reading !== recorded) {
      recorded = reading;
      // Keep a day before the window: Hive's collection hour can still be on the UTC day before the fetch.
      const keepFrom = new Date(windowStart(reading.fetchedAt) - DAY_MS).toISOString();

      history.record(contributorHours(reading.value) ?? [], keepFrom);
      storedHours = history.hours();
    }

    return storedHours;
  }

  app.addHook("onClose", (_instance, done) => {
    history.close();
    done();
  });

  app.get(ROUTES.HIVE_METRICS, async (_request, reply): Promise<HiveMetricsResponse> => {
    reply.header("Cache-Control", "public, max-age=30");

    try {
      if (config.baseUrl === null && !config.production) {
        return { state: "live", fetchedAt: now().toISOString(), metrics: DEV_HIVE_METRICS };
      }

      const readings = await upstream.read();

      return respond(readings, store(readings.contributeMetrics), now());
    } catch (error) {
      // The page treats this like any outage; a 500 would only add noise to the polling front-end.
      reply.log.error(error, "hive metrics failed");

      return UNAVAILABLE;
    }
  });
}
