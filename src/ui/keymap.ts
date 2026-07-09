import { wrapPlainText } from '../lib/viewport.js';

export interface KeyBinding {
  key: string;
  label: string;
}

export const GLOBAL_KEYS: readonly KeyBinding[] = [
  { key: 'q', label: 'quit' },
  { key: '?', label: 'help' },
];

export const LIST_KEYS: readonly KeyBinding[] = [
  { key: 'j/k', label: 'move' },
  { key: '←/→', label: 'tab' },
  { key: 't/n/b', label: 'feed' },
  { key: 'gg/G', label: 'top/bottom' },
  { key: 'enter', label: 'comments' },
  { key: 'o', label: 'browser' },
  { key: 'r', label: 'refresh' },
  { key: '/', label: 'search' },
];

export const COMMENTS_KEYS: readonly KeyBinding[] = [
  { key: 'j/k', label: 'move' },
  { key: 'space', label: 'fold' },
  { key: 'C/E', label: 'collapse/expand' },
  { key: 'gg/G', label: 'top/bottom' },
  { key: 'o', label: 'browser' },
  { key: 'r', label: 'reload' },
  { key: 'esc', label: 'back' },
];

export const SEARCH_RESULTS_KEYS: readonly KeyBinding[] = [
  { key: 'j/k', label: 'move' },
  { key: 'gg/G', label: 'top/bottom' },
  { key: 'enter', label: 'comments' },
  { key: 'o', label: 'browser' },
  { key: '/', label: 'new search' },
  { key: 'esc', label: 'back/quit' },
];

/** Footer hint string: view keys followed by the global keys. */
export function footerHint(viewKeys: readonly KeyBinding[]): string {
  return [...viewKeys, ...GLOBAL_KEYS].map((binding) => `${binding.key} ${binding.label}`).join(' · ');
}

/** How many terminal rows the footer hint wraps to at the given width. */
export function footerRows(viewKeys: readonly KeyBinding[], width: number): number {
  return wrapPlainText(footerHint(viewKeys), width).length;
}
