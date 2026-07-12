import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resetDbCache } from './db.js';
import { isSeen, markSeen } from './seen.js';
import { addSubscription } from './subscriptions.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hn-bits-seen-'));
  process.env.HN_BITS_DB = join(dir, 'hn-bits.db');
});

afterEach(() => {
  resetDbCache();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.HN_BITS_DB;
});

describe('isSeen / markSeen', () => {
  it('is false before marking, true after', () => {
    const sub = addSubscription('postgres', 'postgres', 0);
    expect(isSeen(1, sub.id)).toBe(false);
    markSeen(1, sub.id, 100);
    expect(isSeen(1, sub.id)).toBe(true);
  });

  it('scopes seen state per subscription', () => {
    const a = addSubscription('a', 'a', 0);
    const b = addSubscription('b', 'b', 0);
    markSeen(1, a.id, 100);
    expect(isSeen(1, a.id)).toBe(true);
    expect(isSeen(1, b.id)).toBe(false);
  });

  it('marking twice does not throw (idempotent)', () => {
    const sub = addSubscription('postgres', 'postgres', 0);
    markSeen(1, sub.id, 100);
    expect(() => markSeen(1, sub.id, 200)).not.toThrow();
  });
});
