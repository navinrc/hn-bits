import { openDb } from './db.js';

export interface Subscription {
  id: number;
  name: string;
  query: string;
  minPoints: number;
  createdAt: number;
  lastRunAt: number | null;
}

interface SubscriptionRow {
  id: number;
  name: string;
  query: string;
  min_points: number;
  created_at: number;
  last_run_at: number | null;
}

function fromRow(row: SubscriptionRow): Subscription {
  return {
    id: row.id,
    name: row.name,
    query: row.query,
    minPoints: row.min_points,
    createdAt: row.created_at,
    lastRunAt: row.last_run_at,
  };
}

function assertNameFree(name: string, excludeId?: number): void {
  const db = openDb();
  const conflict =
    excludeId === undefined
      ? db.prepare('SELECT 1 FROM subscriptions WHERE name = ?').get(name)
      : db.prepare('SELECT 1 FROM subscriptions WHERE name = ? AND id != ?').get(name, excludeId);
  if (conflict) throw new Error(`subscription '${name}' already exists`);
}

export function addSubscription(name: string, query: string, minPoints: number): Subscription {
  assertNameFree(name);
  const createdAt = Math.floor(Date.now() / 1000);
  const info = openDb()
    .prepare('INSERT INTO subscriptions (name, query, min_points, created_at) VALUES (?, ?, ?, ?)')
    .run(name, query, minPoints, createdAt);
  return { id: Number(info.lastInsertRowid), name, query, minPoints, createdAt, lastRunAt: null };
}

export function listSubscriptions(): Subscription[] {
  const rows = openDb().prepare('SELECT * FROM subscriptions ORDER BY created_at ASC').all() as SubscriptionRow[];
  return rows.map(fromRow);
}

export function removeSubscription(name: string): boolean {
  const info = openDb().prepare('DELETE FROM subscriptions WHERE name = ?').run(name);
  return info.changes > 0;
}

export function updateSubscription(
  id: number,
  fields: { name: string; query: string; minPoints: number },
): Subscription {
  assertNameFree(fields.name, id);
  const db = openDb();
  db.prepare('UPDATE subscriptions SET name = ?, query = ?, min_points = ? WHERE id = ?').run(
    fields.name,
    fields.query,
    fields.minPoints,
    id,
  );
  return fromRow(db.prepare('SELECT * FROM subscriptions WHERE id = ?').get(id) as SubscriptionRow);
}

export function touchLastRun(id: number, at: number): void {
  openDb().prepare('UPDATE subscriptions SET last_run_at = ? WHERE id = ?').run(at, id);
}
