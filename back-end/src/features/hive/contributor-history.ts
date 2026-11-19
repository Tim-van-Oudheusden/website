import { Database } from "bun:sqlite";

/** One hour of Hive's contributor series: tasks done and contributor agents connected. `hour` is its ISO start. */
export interface ContributorHour {
  hour: string;
  tasks: number;
  fleet: number;
}

/**
 * Hive's contributor hours, kept past the 168 Hive itself keeps so the page can chart a month. Only counts are
 * stored, keyed by hour; no visitor or agent data.
 */
export interface ContributorHistory {
  /** Stores `hours`, replacing stored ones with the same start, and forgets those starting before `keepFrom` (ISO). */
  record(hours: readonly ContributorHour[], keepFrom: string): void;
  /** Every stored hour, oldest first. */
  hours(): ContributorHour[];
  close(): void;
}

export function createContributorHistory(path: string): ContributorHistory {
  const db = new Database(path, { create: true });

  db.run(
    "CREATE TABLE IF NOT EXISTS contributor_hours (hour TEXT PRIMARY KEY, tasks INTEGER NOT NULL, fleet INTEGER NOT NULL)",
  );

  const upsert = db.prepare(
    "INSERT INTO contributor_hours (hour, tasks, fleet) VALUES (?, ?, ?) "
    + "ON CONFLICT (hour) DO UPDATE SET tasks = excluded.tasks, fleet = excluded.fleet",
  );
  const forget = db.prepare("DELETE FROM contributor_hours WHERE hour < ?");
  const selectAll = db.query<ContributorHour, []>("SELECT hour, tasks, fleet FROM contributor_hours ORDER BY hour");
  const recordAll = db.transaction((hours: readonly ContributorHour[], keepFrom: string) => {
    for (const { hour, tasks, fleet } of hours) {
      upsert.run(hour, tasks, fleet);
    }

    forget.run(keepFrom);
  });

  return {
    record(hours, keepFrom) {
      recordAll(hours, keepFrom);
    },
    hours() {
      return selectAll.all();
    },
    close() {
      db.close();
    },
  };
}
