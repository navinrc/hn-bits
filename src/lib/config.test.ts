import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hn-bits-config-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.HN_BITS_CONFIG;
  vi.restoreAllMocks();
});

describe('loadConfig', () => {
  it('returns null when the file is absent', () => {
    process.env.HN_BITS_CONFIG = join(dir, 'missing.json');
    expect(loadConfig()).toBeNull();
  });

  it('deep-merges defaults for missing fields', () => {
    const path = join(dir, 'config.json');
    writeFileSync(path, JSON.stringify({ ollama: { model: 'phi3' } }));
    process.env.HN_BITS_CONFIG = path;
    expect(loadConfig()).toEqual({
      ollama: { host: 'http://localhost:11434', model: 'phi3' },
    });
  });

  it('uses full defaults when ollama key is absent', () => {
    const path = join(dir, 'config.json');
    writeFileSync(path, JSON.stringify({}));
    process.env.HN_BITS_CONFIG = path;
    expect(loadConfig()).toEqual({
      ollama: { host: 'http://localhost:11434', model: 'llama3.2' },
    });
  });

  it('ignores unknown extra keys', () => {
    const path = join(dir, 'config.json');
    writeFileSync(path, JSON.stringify({ ollama: { model: 'phi3' }, telegram: { token: 'x' } }));
    process.env.HN_BITS_CONFIG = path;
    expect(loadConfig()).toEqual({
      ollama: { host: 'http://localhost:11434', model: 'phi3' },
    });
  });

  it('warns and treats invalid JSON as absent, never throws', () => {
    const path = join(dir, 'config.json');
    writeFileSync(path, '{ not json');
    process.env.HN_BITS_CONFIG = path;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadConfig()).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('config invalid'));
  });
});
