import { describe, expect, it } from 'vitest';
import { clampSelection, mapFeedKey, nextFeed, previousFeed } from './listNavigation.js';

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

describe('nextFeed', () => {
  it('advances through the tab order', () => {
    expect(nextFeed('top')).toBe('new');
    expect(nextFeed('new')).toBe('best');
    expect(nextFeed('best')).toBe('ask');
    expect(nextFeed('ask')).toBe('show');
  });

  it('wraps from the last tab to the first', () => {
    expect(nextFeed('show')).toBe('top');
  });
});

describe('previousFeed', () => {
  it('moves back through the tab order', () => {
    expect(previousFeed('show')).toBe('ask');
    expect(previousFeed('ask')).toBe('best');
  });

  it('wraps from the first tab to the last', () => {
    expect(previousFeed('top')).toBe('show');
  });
});
