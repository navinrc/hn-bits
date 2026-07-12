import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { dbPath, openDb, resetDbCache } from './db.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hn-bits-db-'));
  process.env.HN_BITS_DB = join(dir, 'nested', 'hn-bits.db');
});

afterEach(() => {
  resetDbCache();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.HN_BITS_DB;
});

describe('openDb', () => {
  it('creates the parent directory and the db file', () => {
    openDb();
    expect(existsSync(dbPath())).toBe(true);
  });

  it('creates the migrated tables', () => {
    const db = openDb();
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => (row as { name: string }).name);
    expect(tables).toEqual(['bookmarks', 'seen_items', 'subscriptions']);
  });

  it('sets WAL journal mode', () => {
    const db = openDb();
    expect(db.pragma('journal_mode', { simple: true })).toBe('wal');
  });

  it('bumps user_version to the number of migrations applied', () => {
    const db = openDb();
    expect(db.pragma('user_version', { simple: true })).toBe(2);
  });

  it('returns the same cached handle for the same path', () => {
    expect(openDb()).toBe(openDb());
  });

  it('re-running migrate on an already-migrated db is a no-op', () => {
    openDb();
    resetDbCache();
    expect(() => openDb()).not.toThrow();
  });
});
