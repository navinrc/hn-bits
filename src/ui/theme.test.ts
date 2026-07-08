import { afterEach, describe, expect, it } from 'vitest';
import { paletteNames, resolvePaletteName, resolveTheme } from './theme.js';

afterEach(() => {
  delete process.env['HN_THEME'];
});

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
});
