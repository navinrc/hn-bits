import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDbCache } from './db.js';
import { addSubscription, listSubscriptions, removeSubscription, touchLastRun, updateSubscription } from './subscriptions.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hn-bits-subs-'));
  process.env.HN_BITS_DB = join(dir, 'hn-bits.db');
});

afterEach(() => {
  resetDbCache();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.HN_BITS_DB;
});

describe('addSubscription', () => {
  it('inserts and returns the new subscription with lastRunAt null', () => {
    const sub = addSubscription('postgres', 'postgres', 50);
    expect(sub).toMatchObject({ name: 'postgres', query: 'postgres', minPoints: 50, minComments: 0, lastRunAt: null });
    expect(sub.id).toBeGreaterThan(0);
  });

  it('defaults minComments to 0 when omitted, and persists it when given', () => {
    const sub = addSubscription('apple', 'apple', 20, 5);
    expect(sub.minComments).toBe(5);
    expect(listSubscriptions()[0]?.minComments).toBe(5);
  });

  it('throws when the name already exists', () => {
    addSubscription('postgres', 'postgres', 0);
    expect(() => addSubscription('postgres', 'other', 0)).toThrow("subscription 'postgres' already exists");
  });
});

describe('listSubscriptions', () => {
  it('returns subscriptions ordered by creation', () => {
    addSubscription('a', 'a', 0);
    addSubscription('b', 'b', 0);
    expect(listSubscriptions().map((s) => s.name)).toEqual(['a', 'b']);
  });

  it('returns an empty array when none exist', () => {
    expect(listSubscriptions()).toEqual([]);
  });
});

describe('removeSubscription', () => {
  it('deletes an existing subscription and returns true', () => {
    addSubscription('postgres', 'postgres', 0);
    expect(removeSubscription('postgres')).toBe(true);
    expect(listSubscriptions()).toEqual([]);
  });

  it('returns false when the name is not found', () => {
    expect(removeSubscription('missing')).toBe(false);
  });
});

describe('updateSubscription', () => {
  it('updates fields by id', () => {
    const sub = addSubscription('postgres', 'postgres', 0);
    const updated = updateSubscription(sub.id, { name: 'pg', query: 'postgresql', minPoints: 20 });
    expect(updated).toMatchObject({ id: sub.id, name: 'pg', query: 'postgresql', minPoints: 20, minComments: 0 });
  });

  it('updates minComments when given', () => {
    const sub = addSubscription('postgres', 'postgres', 20, 5);
    const updated = updateSubscription(sub.id, { name: 'postgres', query: 'postgres', minPoints: 20, minComments: 10 });
    expect(updated.minComments).toBe(10);
  });

  it('throws when renaming to a name used by another subscription', () => {
    addSubscription('postgres', 'postgres', 0);
    const other = addSubscription('zig-lang', 'zig', 0);
    expect(() => updateSubscription(other.id, { name: 'postgres', query: 'zig', minPoints: 0 })).toThrow(
      "subscription 'postgres' already exists",
    );
  });

  it('allows renaming to its own current name', () => {
    const sub = addSubscription('postgres', 'postgres', 0);
    expect(() => updateSubscription(sub.id, { name: 'postgres', query: 'postgres', minPoints: 10 })).not.toThrow();
  });
});

describe('touchLastRun', () => {
  it('sets lastRunAt', () => {
    const sub = addSubscription('postgres', 'postgres', 0);
    touchLastRun(sub.id, 12345);
    expect(listSubscriptions()[0]?.lastRunAt).toBe(12345);
  });
});
