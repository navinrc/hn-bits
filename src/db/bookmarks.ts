import type { Story } from '../api/firebase.js';
import { openDb } from './db.js';

interface BookmarkRow {
  story_id: number;
  title: string;
  url: string | null;
  by: string;
  score: number;
  descendants: number;
  time: number;
  bookmarked_at: number;
}

function toStory(row: BookmarkRow): Story {
  return {
    id: row.story_id,
    title: row.title,
    url: row.url ?? undefined,
    by: row.by,
    score: row.score,
    descendants: row.descendants,
    time: row.time,
  };
}

let lastBookmarkedAt = 0;

/** Monotonic ms timestamp — Date.now() alone can tie on rapid successive bookmarks. */
function nextBookmarkedAt(): number {
  lastBookmarkedAt = Math.max(Date.now(), lastBookmarkedAt + 1);
  return lastBookmarkedAt;
}

export function isBookmarked(storyId: number): boolean {
  const row = openDb().prepare('SELECT 1 FROM bookmarks WHERE story_id = ?').get(storyId);
  return row != null;
}

/** Toggles the bookmark for a story; returns the new state (true = now bookmarked). */
export function toggleBookmark(story: Story): boolean {
  const db = openDb();
  if (isBookmarked(story.id)) {
    db.prepare('DELETE FROM bookmarks WHERE story_id = ?').run(story.id);
    return false;
  }
  db.prepare(
    `INSERT INTO bookmarks (story_id, title, url, by, score, descendants, time, bookmarked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    story.id,
    story.title,
    story.url ?? null,
    story.by,
    story.score,
    story.descendants,
    story.time,
    nextBookmarkedAt(),
  );
  return true;
}

export function listBookmarks(): Story[] {
  const rows = openDb().prepare('SELECT * FROM bookmarks ORDER BY bookmarked_at DESC').all() as BookmarkRow[];
  return rows.map(toStory);
}
