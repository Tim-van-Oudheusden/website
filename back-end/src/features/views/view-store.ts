import { Database } from "bun:sqlite";

export interface ViewRow {
  slug: string;
  date: string;
  count: number;
}

/** Day-bucketed per-slug view counts. No visitor data of any kind is stored. */
export interface ViewStore {
  record(slug: string, date: string): void;
  list(): ViewRow[];
  close(): void;
}

export function createViewStore(path: string): ViewStore {
  const db = new Database(path, { create: true });

  db.run(
    "CREATE TABLE IF NOT EXISTS views (slug TEXT NOT NULL, date TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (slug, date))",
  );

  const upsert = db.prepare(
    "INSERT INTO views (slug, date, count) VALUES (?, ?, 1) ON CONFLICT (slug, date) DO UPDATE SET count = count + 1",
  );
  const selectAll = db.query<ViewRow, []>("SELECT slug, date, count FROM views ORDER BY slug, date");

  return {
    record(slug, date) {
      upsert.run(slug, date);
    },
    list() {
      return selectAll.all();
    },
    close() {
      db.close();
    },
  };
}
