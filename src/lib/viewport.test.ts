import { describe, expect, it } from 'vitest';
import { ensureVisible, shouldFetchMore, visibleSlice } from './viewport.js';

describe('ensureVisible', () => {
  it('keeps offset at 0 for an empty list', () => {
    expect(ensureVisible(0, 0, 10, 0)).toBe(0);
  });

  it('keeps offset at 0 when height covers the whole count', () => {
    expect(ensureVisible(0, 5, 10, 8)).toBe(0);
  });

  it('scrolls down when selection passes the bottom edge', () => {
    expect(ensureVisible(0, 12, 10, 30)).toBe(3);
  });

  it('scrolls up when selection moves above the top edge', () => {
    expect(ensureVisible(10, 4, 10, 30)).toBe(4);
  });

  it('does not scroll past the last full window', () => {
    expect(ensureVisible(20, 29, 10, 30)).toBe(20);
  });

  it('clamps to 0 when the selected row is the first row', () => {
    expect(ensureVisible(5, 0, 10, 30)).toBe(0);
  });

  it('shrinks the offset when the terminal shrinks below the current offset', () => {
    expect(ensureVisible(20, 25, 5, 30)).toBe(21);
  });
});

describe('visibleSlice', () => {
  const items = Array.from({ length: 30 }, (_, i) => i);

  it('returns the window starting at offset', () => {
    expect(visibleSlice(items, 10, 5)).toEqual([10, 11, 12, 13, 14]);
  });

  it('returns an empty slice for an empty list', () => {
    expect(visibleSlice([], 0, 10)).toEqual([]);
  });

  it('does not overrun the end of the list', () => {
    expect(visibleSlice(items, 25, 10)).toEqual([25, 26, 27, 28, 29]);
  });
});

describe('shouldFetchMore', () => {
  it('is false once everything is fetched', () => {
    expect(shouldFetchMore(29, 30, 30, 10)).toBe(false);
  });

  it('is true when selection is within threshold of the fetched edge', () => {
    expect(shouldFetchMore(21, 30, 100, 10)).toBe(true);
  });

  it('is false when selection is far from the fetched edge', () => {
    expect(shouldFetchMore(5, 30, 100, 10)).toBe(false);
  });
});
