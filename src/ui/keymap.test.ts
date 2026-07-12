import { describe, expect, it } from 'vitest';
import { COMMENTS_KEYS, GLOBAL_KEYS, LIST_KEYS, SEARCH_RESULTS_KEYS, footerHint } from './keymap.js';

// Mirrors the keys each view's useInput handler actually switches on
// (StoryList.tsx, Comments.tsx, SearchResults.tsx, App.tsx).
const HANDLED = {
  global: ['q', '?'],
  list: ['j/k', '←/→', 't/n/b', 'gg/G', 'enter', 'o', 'r', '/', 's', 'a', 'B'],
  comments: ['j/k', 'space', 'C/E', 'gg/G', 'o', 'r', 's', 'a', 'B', 'esc'],
  searchResults: ['j/k', 'gg/G', 'enter', 'o', '/', 's', 'a', 'B', 'S', 'esc'],
};

function keys(bindings: readonly { key: string }[]): string[] {
  return bindings.map((b) => b.key);
}

describe('keymap completeness', () => {
  it('global keymap covers every handled global key', () => {
    expect(keys(GLOBAL_KEYS)).toEqual(HANDLED.global);
  });

  it('list keymap covers every key handled in StoryList', () => {
    expect(keys(LIST_KEYS)).toEqual(expect.arrayContaining(HANDLED.list));
  });

  it('comments keymap covers every key handled in Comments', () => {
    expect(keys(COMMENTS_KEYS)).toEqual(expect.arrayContaining(HANDLED.comments));
  });

  it('search results keymap covers every key handled in SearchResults', () => {
    expect(keys(SEARCH_RESULTS_KEYS)).toEqual(expect.arrayContaining(HANDLED.searchResults));
  });
});

describe('footerHint', () => {
  it('appends the global keys after the view keys', () => {
    const hint = footerHint(LIST_KEYS);
    expect(hint.endsWith('q quit · ? help')).toBe(true);
    expect(hint.startsWith('j/k move')).toBe(true);
  });
});
