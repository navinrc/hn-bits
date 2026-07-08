import { describe, expect, it } from 'vitest';
import {
  ensureVisible,
  ensureVisibleLines,
  shouldFetchMore,
  sliceByLines,
  visibleSlice,
  wrapPlainText,
} from './viewport.js';

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

describe('wrapPlainText', () => {
  it('wraps on word boundaries without exceeding width', () => {
    expect(wrapPlainText('the quick brown fox', 10)).toEqual(['the quick', 'brown fox']);
  });

  it('hard-breaks a word longer than width', () => {
    expect(wrapPlainText('supercalifragilistic', 6)).toEqual(['superc', 'alifra', 'gilist', 'ic']);
  });

  it('keeps blank lines as empty entries', () => {
    expect(wrapPlainText('para one\n\npara two', 20)).toEqual(['para one', '', 'para two']);
  });

  it('returns a single empty line for empty text', () => {
    expect(wrapPlainText('', 10)).toEqual(['']);
  });
});

describe('ensureVisibleLines', () => {
  const heights = [1, 3, 1, 5, 1]; // starts: 0, 1, 4, 5, 10; total 11

  it('keeps topLine at 0 when everything fits', () => {
    expect(ensureVisibleLines(heights, 0, 0, 20)).toBe(0);
  });

  it('scrolls down so a later row is visible', () => {
    expect(ensureVisibleLines(heights, 3, 0, 4)).toBe(2);
  });

  it('scrolls up when selection moves above the top edge', () => {
    expect(ensureVisibleLines(heights, 0, 5, 4)).toBe(0);
  });

  it('does not scroll past the last full window', () => {
    expect(ensureVisibleLines(heights, 4, 8, 4)).toBe(7);
  });
});

describe('sliceByLines', () => {
  const heights = [1, 3, 1, 5, 1]; // starts: 0, 1, 4, 5, 10; total 11

  it('returns the rows intersecting the window with no clipping when aligned', () => {
    expect(sliceByLines(heights, 0, 4)).toEqual({ first: 0, last: 1, clipTop: 0, clipBottom: 0 });
  });

  it('clips the top and bottom rows when the window starts mid-row', () => {
    expect(sliceByLines(heights, 2, 4)).toEqual({ first: 1, last: 3, clipTop: 1, clipBottom: 4 });
  });

  it('clips the trailing row against the end of content', () => {
    expect(sliceByLines(heights, 8, 10)).toEqual({ first: 3, last: 4, clipTop: 3, clipBottom: 0 });
  });

  it('returns an empty window for an empty heights array', () => {
    expect(sliceByLines([], 0, 10)).toEqual({ first: 0, last: -1, clipTop: 0, clipBottom: 0 });
  });
});
