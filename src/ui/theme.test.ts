import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { paletteNames, resolvePaletteName, resolvePaletteSource, resolveTheme } from './theme.js';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hn-bits-theme-'));
  // Points at a file that doesn't exist yet, isolating every test in this file from
  // whatever the real user's ~/.config/hn-bits/config.json happens to contain.
  process.env.HN_BITS_CONFIG = join(dir, 'config.json');
});

afterEach(() => {
  delete process.env['HN_THEME'];
  delete process.env.HN_BITS_CONFIG;
  rmSync(dir, { recursive: true, force: true });
});

function writeThemeConfig(name: string): void {
  const path = join(dir, 'config.json');
  writeFileSync(path, JSON.stringify({ ui: { theme: name } }));
  process.env.HN_BITS_CONFIG = path;
}

describe('resolvePaletteName', () => {
  it('defaults to hn', () => {
    expect(resolvePaletteName()).toBe('hn');
  });

  it('uses an explicit name over the env var', () => {
    process.env['HN_THEME'] = 'mocha';
    expect(resolvePaletteName('dracula')).toBe('dracula');
  });

  it('falls back to the env var when no explicit name is given', () => {
    process.env['HN_THEME'] = 'nord';
    expect(resolvePaletteName()).toBe('nord');
  });

  it('falls back to hn for an unknown name', () => {
    expect(resolvePaletteName('not-a-theme')).toBe('hn');
  });

  it('falls back to the config value when no flag or env var is given', () => {
    writeThemeConfig('gruvbox');
    expect(resolvePaletteName()).toBe('gruvbox');
  });

  it('prefers the env var over the config value', () => {
    writeThemeConfig('gruvbox');
    process.env['HN_THEME'] = 'nord';
    expect(resolvePaletteName()).toBe('nord');
  });

  it('prefers an explicit name over the config value', () => {
    writeThemeConfig('gruvbox');
    expect(resolvePaletteName('dracula')).toBe('dracula');
  });
});

describe('resolvePaletteSource', () => {
  it('is default when nothing is set', () => {
    expect(resolvePaletteSource()).toBe('default');
  });

  it('is flag when an explicit name is given', () => {
    expect(resolvePaletteSource('dracula')).toBe('flag');
  });

  it('is env when only the env var is set', () => {
    process.env['HN_THEME'] = 'nord';
    expect(resolvePaletteSource()).toBe('env');
  });

  it('is config when only the config value is set', () => {
    writeThemeConfig('gruvbox');
    expect(resolvePaletteSource()).toBe('config');
  });

  it('is default when the config value is invalid', () => {
    writeThemeConfig('not-a-theme');
    expect(resolvePaletteSource()).toBe('default');
  });
});

describe('resolveTheme', () => {
  it('returns distinct colors per palette', () => {
    expect(resolveTheme('hn').colors).not.toEqual(resolveTheme('tokyo').colors);
  });

  it('exposes every declared palette', () => {
    for (const name of paletteNames()) {
      expect(resolveTheme(name).colors.accent).toMatch(/^ansi256\(\d+\)$/);
    }
  });

  it('gives concord a cyan accent, ported from concord\'s ratatui Color::Cyan', () => {
    expect(resolveTheme('concord').colors.accent).toBe('ansi256(44)');
  });
});
