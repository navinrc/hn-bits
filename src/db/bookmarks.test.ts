import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Story } from '../api/firebase.js';
import { resetDbCache } from './db.js';
import { isBookmarked, listBookmarks, toggleBookmark } from './bookmarks.js';

let dir: string;

const story: Story = {
  id: 1,
  title: 'Postgres 18 released',
  url: 'https://postgresql.org',
  by: 'author',
  score: 980,
  descendants: 512,
  time: 1700000000,
};

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'hn-bits-bookmarks-'));
  process.env.HN_BITS_DB = join(dir, 'hn-bits.db');
});

afterEach(() => {
  resetDbCache();
  rmSync(dir, { recursive: true, force: true });
  delete process.env.HN_BITS_DB;
});

describe('toggleBookmark', () => {
  it('adds a bookmark and returns true', () => {
    expect(toggleBookmark(story)).toBe(true);
    expect(isBookmarked(story.id)).toBe(true);
  });

  it('removes an existing bookmark and returns false', () => {
    toggleBookmark(story);
    expect(toggleBookmark(story)).toBe(false);
    expect(isBookmarked(story.id)).toBe(false);
  });

  it('stores a text-post story (no url) with url null', () => {
    const textStory: Story = { ...story, id: 2, url: undefined };
    toggleBookmark(textStory);
    expect(listBookmarks()[0]).toMatchObject({ id: 2, url: undefined });
  });
});

describe('listBookmarks', () => {
  it('returns bookmarks newest bookmarked first', () => {
    toggleBookmark({ ...story, id: 1 });
    toggleBookmark({ ...story, id: 2 });
    expect(listBookmarks().map((s) => s.id)).toEqual([2, 1]);
  });

  it('returns an empty array when none exist', () => {
    expect(listBookmarks()).toEqual([]);
  });
});
