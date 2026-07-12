import { describe, expect, it } from 'vitest';
import { clampSelection, mapFeedKey, nextTab, previousTab } from './listNavigation.js';

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

describe('nextTab', () => {
  it('advances through the tab order', () => {
    expect(nextTab('top')).toBe('new');
    expect(nextTab('new')).toBe('best');
    expect(nextTab('best')).toBe('ask');
    expect(nextTab('ask')).toBe('show');
    expect(nextTab('show')).toBe('saved');
  });

  it('wraps from the last tab to the first', () => {
    expect(nextTab('saved')).toBe('top');
  });
});

describe('previousTab', () => {
  it('moves back through the tab order', () => {
    expect(previousTab('saved')).toBe('show');
    expect(previousTab('show')).toBe('ask');
    expect(previousTab('ask')).toBe('best');
  });

  it('wraps from the first tab to the last', () => {
    expect(previousTab('top')).toBe('saved');
  });
});
