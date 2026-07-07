# Bookmarks (`src/db/bookmarks.ts` + UI)

Save stories for later. Snapshot-based: bookmark stores story fields at save time ([01-storage.md](01-storage.md)) so the list renders offline/instantly.

## Toggling — `B` key (capital; lowercase `b` = best feed / back)

Available in **StoryList** (feeds + search results) and **StoryDetail**:

| Key | Where | Action |
|-----|-------|--------|
| `B` | list row selected / detail view | `toggleBookmark(story)`; footer flash `bookmarked ✓` / `bookmark removed` (1.5 s) |

- Bookmarked stories show a `★` marker in list rows (before title) and in the detail metadata line.
- Re-bookmarking an existing bookmark removes it (toggle). Toggling refreshes nothing else — no confirm.

## Listing — `hn bookmarks`

```bash
hn bookmarks
```

Opens the TUI in bookmarks view — **StoryList component reused** (like search results), data source = `listBookmarks()`, newest bookmarked first.

```text
 hn-bits · bookmarks                              12 saved
 ▸ ★ 1. Postgres 18 released                980⯅ 512💬 34d  author
   ★ 2. Show HN: I built a thing            412⯅ 213💬 60d  author

 j/k move · enter open · o browser · B remove · esc quit · q quit
```

Differences from feed list:

- No pagination needed below 20; above 20 reuse `]`/`[` paging over the local array (no network).
- Feed keys (`t`/`n`/`b`) inactive; `/` inactive (no search over bookmarks in V3).
- `B` removes the selected bookmark, row disappears immediately.
- `enter` → StoryDetail → Comments work as normal (comments fetched live by story id; score/comment counts shown are the stored snapshot — staleness accepted, noted in footer? No — silently accepted).
- Age column shows story age (from snapshot `time`), matching other lists.

## Non-goals (V3)

Tags/folders, notes, export, sync, bookmark search, auto-refreshing snapshots.
