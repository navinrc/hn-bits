import { mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import DatabaseConstructor, { type Database } from 'better-sqlite3';

const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE subscriptions (
    id          INTEGER PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    query       TEXT NOT NULL,
    min_points  INTEGER NOT NULL DEFAULT 0,
    created_at  INTEGER NOT NULL,
    last_run_at INTEGER
  );

  CREATE TABLE seen_items (
    story_id        INTEGER NOT NULL,
    subscription_id INTEGER NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    notified_at     INTEGER NOT NULL,
    PRIMARY KEY (story_id, subscription_id)
  );

  CREATE TABLE bookmarks (
    story_id      INTEGER PRIMARY KEY,
    title         TEXT NOT NULL,
    url           TEXT,
    by            TEXT NOT NULL,
    score         INTEGER NOT NULL,
    descendants   INTEGER NOT NULL,
    time          INTEGER NOT NULL,
    bookmarked_at INTEGER NOT NULL
  );
  `,
  `ALTER TABLE subscriptions ADD COLUMN min_comments INTEGER NOT NULL DEFAULT 0;`,
];

export function dbPath(): string {
  return process.env.HN_BITS_DB || join(homedir(), '.local', 'share', 'hn-bits', 'hn-bits.db');
}

let cached: { path: string; db: Database } | null = null;

function migrate(db: Database): void {
  const currentVersion = db.pragma('user_version', { simple: true }) as number;
  for (let i = currentVersion; i < MIGRATIONS.length; i++) {
    db.transaction(() => {
      db.exec(MIGRATIONS[i]!);
      db.pragma(`user_version = ${i + 1}`);
    })();
  }
}

/** Opens (or returns the cached handle for) the app database, running pending migrations. */
export function openDb(): Database {
  const path = dbPath();
  if (cached && cached.path === path) return cached.db;
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseConstructor(path);
  db.pragma('journal_mode = WAL');
  migrate(db);
  cached = { path, db };
  return db;
}

/** Test-only: drops the cached handle so the next openDb() re-resolves HN_BITS_DB. */
export function resetDbCache(): void {
  cached?.db.close();
  cached = null;
}
