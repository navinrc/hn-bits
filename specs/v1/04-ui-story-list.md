# StoryList view (`src/ui/StoryList.tsx`)

Default view when `hn` launches. Also renders search results (same component, different data source — see [07-search.md](07-search.md)).

## Layout

```text
 hn-bits · top                                    page 1
 ▸  1. Show HN: I built a thing            412⯅ 213💬 3h  author
    2. Postgres 18 released                980⯅ 512💬 5h  author
    ...
   20. Some other story                     45⯅  12💬 9h  author

 j/k move · enter open · o browser · t/n/b feed · ]/[ page · / search · q quit
```

- Header line: app name + current feed (or `search: <query>`), current page number.
- One story per row: rank, title (truncated to terminal width), score, comment count, relative age (`3h`, `2d`), author.
- Selected row marked with `▸` and highlighted (inverse or color).
- Footer: key hints, single line, dim.

## Behavior

- **Data:** on mount / feed change, `fetchStoryIds(feed)` once; then `fetchStories(slice)` per page. Page size **20**.
- **Pagination:** `]` next page, `[` previous page. ID list already in memory, so paging only refetches items. Selection resets to first row on page change.
- **Feed switching:** `t` top, `n` new, `b` best — resets to page 1. (In list view `b` = best feed; `b`-as-back applies in deeper views only. `esc` is the universal back key.)
- **Navigation:** `j`/`↓` down, `k`/`↑` up; clamped at list edges (no wrap).
- **Enter** opens StoryDetail for selected story. **`o`** opens story URL directly in browser without leaving list (text posts fall back to HN item page).
- **Loading:** replace list body with single `loading…` line. **Error:** show error message + hint `r` to retry.
- **Age formatting:** relative, coarse — `<60m` minutes, `<24h` hours, else days. Lives in a small helper (can sit in `lib/`).

## Relative age reference

| Delta | Shown |
|-------|-------|
| < 1h | `Nm` |
| < 24h | `Nh` |
| ≥ 24h | `Nd` |
