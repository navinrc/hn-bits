import type { Feed } from '../api/firebase.js';

/** Every tab reachable via ←/→, beyond the fetchable Feed values. */
export type TabId = Feed | 'saved' | 'subs';

export function clampSelection(current: number, delta: number, length: number): number {
  if (length === 0) return 0;
  return Math.min(Math.max(current + delta, 0), length - 1);
}

const FEED_KEYS: Record<string, Feed> = { t: 'top', n: 'new', b: 'best' };

export function mapFeedKey(key: string): Feed | undefined {
  return FEED_KEYS[key];
}

const TAB_ORDER: TabId[] = ['top', 'new', 'best', 'ask', 'show', 'saved', 'subs'];

export function nextTab(current: TabId): TabId {
  const index = TAB_ORDER.indexOf(current);
  return TAB_ORDER[(index + 1) % TAB_ORDER.length]!;
}

export function previousTab(current: TabId): TabId {
  const index = TAB_ORDER.indexOf(current);
  return TAB_ORDER[(index - 1 + TAB_ORDER.length) % TAB_ORDER.length]!;
}
