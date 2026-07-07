import type { Feed } from '../api/firebase.js';

export const PAGE_SIZE = 20;

export function pageSlice<T>(items: T[], page: number, pageSize = PAGE_SIZE): T[] {
  const start = page * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(itemCount: number, pageSize = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function clampSelection(current: number, delta: number, length: number): number {
  if (length === 0) return 0;
  return Math.min(Math.max(current + delta, 0), length - 1);
}

const FEED_KEYS: Record<string, Feed> = { t: 'top', n: 'new', b: 'best' };

export function mapFeedKey(key: string): Feed | undefined {
  return FEED_KEYS[key];
}
