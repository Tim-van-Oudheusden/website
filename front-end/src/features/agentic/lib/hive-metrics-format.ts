/**
 * Text formats for the Hive metrics section. Clock times take an IANA `timeZone`, or `null` for the visitor's own,
 * so "last update 14:05" reads in local time.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const ONE_DECIMAL = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 1 });

/** A count or chart value: grouped thousands, at most one decimal. */
export function formatValue(value: number): string {
  return ONE_DECIMAL.format(value);
}

/** "14:05". */
export function formatClock(iso: string, timeZone: string | null): string {
  const options: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hourCycle: "h23" };

  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: timeZone ?? undefined }).format(Date.parse(iso));
}

/** "2 Nov 2026, 14:05 UTC": the absolute time behind a relative one. */
export function formatDateTime(iso: string, timeZone: string | null): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
    timeZone: timeZone ?? undefined,
  }).format(Date.parse(iso));
}

/** "40 s ago", "3 min ago", "2 h ago", "4 d ago"; never negative. */
export function formatAgo(iso: string, now: number): string {
  const elapsed = Math.max(0, now - Date.parse(iso));

  if (elapsed < MINUTE) {
    return `${String(Math.round(elapsed / SECOND))} s ago`;
  }

  if (elapsed < HOUR) {
    return `${String(Math.floor(elapsed / MINUTE))} min ago`;
  }

  if (elapsed < DAY) {
    return `${String(Math.floor(elapsed / HOUR))} h ago`;
  }

  return `${String(Math.floor(elapsed / DAY))} d ago`;
}

/** "Mon 27 Oct" for a UTC day bucket, read in UTC so the day never shifts. */
export function formatUtcDay(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(Date.parse(iso))
    .replace(",", "");
}

/** "Mon 13:00" for an hourly bucket. */
export function formatHour(epochMs: number, timeZone: string | null): string {
  const options: Intl.DateTimeFormatOptions = { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" };

  return new Intl.DateTimeFormat("en-GB", { ...options, timeZone: timeZone ?? undefined }).format(epochMs).replace(",", "");
}

/** A run time: "90 s", "6 min", "1.5 h". */
export function formatDuration(seconds: number): string {
  if (seconds < 120) {
    return `${String(Math.round(seconds))} s`;
  }

  if (seconds < 90 * 60) {
    return `${String(Math.round(seconds / 60))} min`;
  }

  return formatHours(seconds / 3600);
}

/** A time to merge in hours: "40 min", "1.4 h", "15 h". */
export function formatHours(hours: number): string {
  if (hours < 1) {
    return `${String(Math.round(hours * 60))} min`;
  }

  return `${hours < 10 ? ONE_DECIMAL.format(hours) : String(Math.round(hours))} h`;
}

function lastCount(count: number, unit: string): string {
  return count === 1 ? `last ${unit}` : `last ${String(count)} ${unit}s`;
}

/**
 * The span between two measurements as "last 18 minutes", "last 17 hours" or "last 2 days"; `null` when they are
 * under a minute apart, so a title never claims a span the data does not cover.
 */
export function formatSpan(fromIso: string, toIso: string): string | null {
  const span = Date.parse(toIso) - Date.parse(fromIso);
  const minutes = Math.round(span / MINUTE);

  if (minutes < 1) {
    return null;
  }

  if (minutes < 60) {
    return lastCount(minutes, "minute");
  }

  const hours = Math.round(span / HOUR);

  return hours < 48 ? lastCount(hours, "hour") : lastCount(Math.round(span / DAY), "day");
}
