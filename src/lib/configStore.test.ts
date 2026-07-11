import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getConfigValue, listConfigEntries, setConfigValue, unsetConfigValue } from './configStore.js';

let dir: string;
let path: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hn-bits-config-store-'));
  path = join(dir, 'nested', 'config.json');
  process.env.HN_BITS_CONFIG = path;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  delete process.env.HN_BITS_CONFIG;
});

describe('setConfigValue', () => {
  it('creates the file and parent directory when absent', () => {
    setConfigValue('telegram.enabled', 'true');
    expect(existsSync(path)).toBe(true);
    expect(JSON.parse(readFileSync(path, 'utf-8'))).toEqual({ telegram: { enabled: true } });
  });

  it('preserves untouched keys when setting a second value', () => {
    setConfigValue('telegram.enabled', 'true');
    setConfigValue('telegram.botToken', '123:abc');
    expect(JSON.parse(readFileSync(path, 'utf-8'))).toEqual({
      telegram: { enabled: true, botToken: '123:abc' },
    });
  });

  it('coerces booleans and numbers', () => {
    setConfigValue('desktopNotifications.enabled', 'true');
    setConfigValue('desktopNotifications.timeoutSeconds', '15');
    expect(JSON.parse(readFileSync(path, 'utf-8'))).toEqual({
      desktopNotifications: { enabled: true, timeoutSeconds: 15 },
    });
  });

  it('throws on an unknown key', () => {
    expect(() => setConfigValue('nope.field', 'x')).toThrow("unknown config key: 'nope.field'");
  });

  it('throws on an invalid boolean value', () => {
    expect(() => setConfigValue('desktopNotifications.enabled', 'maybe')).toThrow(
      "expected 'true' or 'false'",
    );
  });

  it('throws on an invalid number value', () => {
    expect(() => setConfigValue('desktopNotifications.timeoutSeconds', 'soon')).toThrow(
      'expected a number',
    );
  });
});

describe('getConfigValue', () => {
  it('returns ollama defaults even when the file is absent', () => {
    expect(getConfigValue('ollama.host')).toBe('http://localhost:11434');
  });

  it('returns undefined for an unset telegram key', () => {
    expect(getConfigValue('telegram.botToken')).toBeUndefined();
  });

  it('returns the raw, unmasked value after set', () => {
    setConfigValue('telegram.botToken', '123456:ABCDEF');
    expect(getConfigValue('telegram.botToken')).toBe('123456:ABCDEF');
  });
});

describe('unsetConfigValue', () => {
  it('removes a leaf and prunes an emptied section', () => {
    setConfigValue('telegram.botToken', '123:abc');
    unsetConfigValue('telegram.botToken');
    expect(JSON.parse(readFileSync(path, 'utf-8'))).toEqual({});
  });

  it('leaves sibling keys in the section intact', () => {
    setConfigValue('telegram.enabled', 'true');
    setConfigValue('telegram.botToken', '123:abc');
    unsetConfigValue('telegram.botToken');
    expect(JSON.parse(readFileSync(path, 'utf-8'))).toEqual({ telegram: { enabled: true } });
  });

  it('is a no-op when the file is absent', () => {
    expect(() => unsetConfigValue('telegram.botToken')).not.toThrow();
    expect(existsSync(path)).toBe(false);
  });
});

describe('listConfigEntries', () => {
  it('masks sensitive values', () => {
    setConfigValue('telegram.botToken', '123456789:ABCDEF');
    const entry = listConfigEntries().find((e) => e.key === 'telegram.botToken');
    expect(entry?.value).toBe('123456…(hidden)');
  });

  it('reports unset keys as undefined', () => {
    const entry = listConfigEntries().find((e) => e.key === 'telegram.chatId');
    expect(entry?.value).toBeUndefined();
  });

  it('reports ollama defaults', () => {
    const entry = listConfigEntries().find((e) => e.key === 'ollama.model');
    expect(entry?.value).toBe('llama3.2');
  });
});
