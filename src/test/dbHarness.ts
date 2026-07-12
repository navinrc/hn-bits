import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach } from 'vitest';
import { resetDbCache } from '../db/db.js';

/** Points HN_BITS_DB at a fresh temp file for the duration of each test — keeps
 * db.ts-backed components (StoryRow's bookmark star, B-key toggles) off the real
 * user database during test runs. */
export function useTempDb(prefix: string): void {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), prefix));
    process.env.HN_BITS_DB = join(dir, 'hn-bits.db');
  });

  afterEach(() => {
    resetDbCache();
    rmSync(dir, { recursive: true, force: true });
    delete process.env.HN_BITS_DB;
  });
}
