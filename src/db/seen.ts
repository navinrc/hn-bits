import { openDb } from './db.js';

export function isSeen(storyId: number, subscriptionId: number): boolean {
  const row = openDb()
    .prepare('SELECT 1 FROM seen_items WHERE story_id = ? AND subscription_id = ?')
    .get(storyId, subscriptionId);
  return row != null;
}

export function markSeen(storyId: number, subscriptionId: number, at: number): void {
  openDb()
    .prepare('INSERT OR IGNORE INTO seen_items (story_id, subscription_id, notified_at) VALUES (?, ?, ?)')
    .run(storyId, subscriptionId, at);
}
