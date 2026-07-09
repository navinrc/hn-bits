# Bookmarks (`src/db/bookmarks.ts` + UI)

Save stories for later. Snapshot-based: bookmark stores story fields at save time ([01-storage.md](01-storage.md)) so the list renders offline/instantly.

## Toggling — `B` key (capital; lowercase `b` = best feed / back)

Available in the **story list** (feeds + search results, selected row) and in **Comments** (the open story):

| Key | Where | Action |
|-----|-------|--------|
| `B` | list row selected / comments open | `toggleBookmark(story)`; footer flash `bookmarked ✓` / `bookmark removed` (1.5 s) |

- Bookmarked stories show a `★` prefix on the **meta line** of the story row (`StoryRow`), before the score: `★ 980 points by author 34d ago | 512 comments`. Title line, rank alignment, and selection highlight untouched.
- Re-bookmarking an existing bookmark removes it (toggle). Toggling refreshes nothing else — no confirm.
- `B` joins `LIST_KEYS`, `SEARCH_RESULTS_KEYS`, and `COMMENTS_KEYS` in `src/ui/keymap.ts` (footer + `?` overlay update for free).

## Listing — the `saved` tab

Bookmarks are a 6th tab in the `TabBar`: `Top New Best Ask Show Saved`. Reached like any tab (`←/→`); `hn bookmarks` opens the TUI with the saved tab active.

```text
                                                 ╭───────╮
  Hacker News   Top   New   Best   Ask   Show    │ Saved │        ? help
─────────────────────────────────────────────────╯       ╰──────────────

  ❯  1. Postgres 18 released (postgresql.org)
        ★ 980 points by author 34d ago | 512 comments

     2. Show HN: I built a thing (example.com)
        ★ 412 points by author 60d ago | 213 comments

 j/k move · ←/→ tab · … · q quit · ? help          ← keymap.ts-generated
```

Differences from feed tabs:

- Data source = `listBookmarks()` (local, newest bookmarked first) instead of a Firebase feed — no network, no progressive fetch. Reuses **`StoryListView`** (the presentational windowed list, same as search results), not the `StoryList` fetch container. Continuous-scroll windowing as everywhere; no paging.
- `TabBar`'s `active` prop widens from `Feed` to `Feed | 'saved'` (`TABS` gains the entry; the notch math is width-driven and needs no change).
- `t`/`n`/`b` jump to their feeds as usual; `/` stays global Algolia search (no search *over* bookmarks in V3). `r` re-reads `listBookmarks()`.
- `B` removes the selected bookmark; row disappears immediately.
- `enter` opens Comments as normal (fetched live by story id; score/comment counts shown are the stored snapshot — staleness silently accepted).
- Age shows story age (from snapshot `time`), matching other lists.
- Empty state: `no bookmarks yet — press B on a story` (centered, muted), same slot as a feed's loading indicator.

## Non-goals (V3)

Tags/folders, notes, export, sync, bookmark search, auto-refreshing snapshots.
