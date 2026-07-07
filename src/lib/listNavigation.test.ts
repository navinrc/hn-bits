import { describe, expect, it } from 'vitest';
import { clampSelection, mapFeedKey, pageSlice, totalPages } from './listNavigation.js';

describe('pageSlice', () => {
  const ids = Array.from({ length: 30 }, (_, i) => i);

  it('returns a full page from the start', () => {
    expect(pageSlice(ids, 0, 20)).toEqual(ids.slice(0, 20));
  });

  it('returns the remaining partial page', () => {
    expect(pageSlice(ids, 1, 20)).toEqual(ids.slice(20, 30));
  });
});

describe('totalPages', () => {
  it('rounds up to include a partial page', () => {
    expect(totalPages(45, 20)).toBe(3);
  });

  it('divides evenly', () => {
    expect(totalPages(40, 20)).toBe(2);
  });

  it('guards against zero items', () => {
    expect(totalPages(0, 20)).toBe(1);
  });
});

describe('clampSelection', () => {
  it('does not move above the top', () => {
    expect(clampSelection(0, -1, 5)).toBe(0);
  });

  it('does not move past the bottom', () => {
    expect(clampSelection(4, 1, 5)).toBe(4);
  });

  it('moves normally within bounds', () => {
    expect(clampSelection(2, 1, 5)).toBe(3);
    expect(clampSelection(2, -1, 5)).toBe(1);
  });
});

describe('mapFeedKey', () => {
  it('maps known keys', () => {
    expect(mapFeedKey('t')).toBe('top');
    expect(mapFeedKey('n')).toBe('new');
    expect(mapFeedKey('b')).toBe('best');
  });

  it('returns undefined for unknown keys', () => {
    expect(mapFeedKey('x')).toBeUndefined();
  });
});
