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
  { key: 's', label: 'summary' },
  { key: 'a', label: 'ask ai' },
  { key: 'B', label: 'bookmark' },
];

export const COMMENTS_KEYS: readonly KeyBinding[] = [
  { key: 'j/k', label: 'move' },
  { key: 'space', label: 'fold' },
  { key: 'C/E', label: 'collapse/expand' },
  { key: 'gg/G', label: 'top/bottom' },
  { key: 'o', label: 'browser' },
  { key: 'r', label: 'reload' },
  { key: 's', label: 'summary' },
  { key: 'a', label: 'ask ai' },
  { key: 'B', label: 'bookmark' },
  { key: 'esc', label: 'back' },
];

export const SEARCH_RESULTS_KEYS: readonly KeyBinding[] = [
  { key: 'j/k', label: 'move' },
  { key: 'gg/G', label: 'top/bottom' },
  { key: 'enter', label: 'comments' },
  { key: 'o', label: 'browser' },
  { key: '/', label: 'new search' },
  { key: 's', label: 'summary' },
  { key: 'a', label: 'ask ai' },
  { key: 'B', label: 'bookmark' },
  { key: 'S', label: 'subscribe' },
  { key: 'esc', label: 'back/quit' },
];

export const SUBS_KEYS: readonly KeyBinding[] = [
  { key: 'j/k', label: 'move' },
  { key: '←/→', label: 'tab' },
  { key: 't/n/b', label: 'feed' },
  { key: 'enter', label: 'matches' },
  { key: 'a', label: 'add' },
  { key: 'e', label: 'edit' },
  { key: 'd', label: 'delete' },
];

export const SUB_MATCHES_KEYS: readonly KeyBinding[] = [
  { key: 'j/k', label: 'move' },
  { key: 'gg/G', label: 'top/bottom' },
  { key: 'enter', label: 'comments' },
  { key: 'o', label: 'browser' },
  { key: 'B', label: 'bookmark' },
  { key: 's', label: 'summary' },
  { key: 'a', label: 'ask ai' },
  { key: 'r', label: 'refetch' },
  { key: 'esc', label: 'back' },
];

export const SUB_FORM_KEYS: readonly KeyBinding[] = [
  { key: 'tab', label: 'next field' },
  { key: 'enter', label: 'save' },
  { key: 'esc', label: 'cancel' },
];

export const SAVED_KEYS: readonly KeyBinding[] = [
  { key: 'j/k', label: 'move' },
  { key: '←/→', label: 'tab' },
  { key: 't/n/b', label: 'feed' },
  { key: 'gg/G', label: 'top/bottom' },
  { key: 'enter', label: 'comments' },
  { key: 'o', label: 'browser' },
  { key: 'r', label: 'reload' },
  { key: '/', label: 'search' },
  { key: 's', label: 'summary' },
  { key: 'a', label: 'ask ai' },
  { key: 'B', label: 'remove' },
];

/** Footer hint string: view keys followed by the global keys. */
export function footerHint(viewKeys: readonly KeyBinding[]): string {
  return [...viewKeys, ...GLOBAL_KEYS].map((binding) => `${binding.key} ${binding.label}`).join(' · ');
}

/** How many terminal rows the footer hint wraps to at the given width. */
export function footerRows(viewKeys: readonly KeyBinding[], width: number): number {
  return wrapPlainText(footerHint(viewKeys), width).length;
}
