import type { Feed } from '../api/firebase.js';

export function clampSelection(current: number, delta: number, length: number): number {
  if (length === 0) return 0;
  return Math.min(Math.max(current + delta, 0), length - 1);
}

const FEED_KEYS: Record<string, Feed> = { t: 'top', n: 'new', b: 'best' };

export function mapFeedKey(key: string): Feed | undefined {
  return FEED_KEYS[key];
}

const FEED_ORDER: Feed[] = ['top', 'new', 'best', 'ask', 'show'];

export function nextFeed(current: Feed): Feed {
  const index = FEED_ORDER.indexOf(current);
  return FEED_ORDER[(index + 1) % FEED_ORDER.length]!;
}

export function previousFeed(current: Feed): Feed {
  const index = FEED_ORDER.indexOf(current);
  return FEED_ORDER[(index - 1 + FEED_ORDER.length) % FEED_ORDER.length]!;
}
