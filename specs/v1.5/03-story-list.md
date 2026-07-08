# V1.5 — Story List: Tabs + Continuous Scroll

## Feeds

`src/api/firebase.ts`: `Feed` union gains `'ask' | 'show'`; feed paths gain `askstories` / `showstories`. Fetch behavior unchanged (ids once, items in batches).

## Tab bar — `src/ui/TabBar.tsx`

Presentational component rendered in the Header:

```
 Top │ New │ Best │ Ask │ Show
```

Active tab styled via `theme` (accent + bold or inverse). Tab order: `['top', 'new', 'best', 'ask', 'show']`.

Switching:
- `←` / `→`: previous/next tab (wraps). `nextFeed` / `previousFeed` in `src/lib/listNavigation.ts`.
- `t` / `n` / `b`: direct shortcuts (kept from V1 via `mapFeedKey`; `ask`/`show` get no letter — `a` is reserved for V2 Ask AI).

Switching feeds resets selection to 0 and refetches ids. In-flight responses from the previous feed are discarded via a request token (a counter captured per load; stale responses compare tokens and drop).

## Continuous scroll + progressive fetch

Pagination dies. Selection is an absolute index over the feed's id list (~500 ids).

- Initial load: fetch ids, then first batch of **30** stories.
- As selection approaches the fetched edge (`shouldFetchMore` with threshold **10**), fetch the next 30-id batch and append.
- Rows beyond fetched range are simply not reachable yet — selection clamps to `fetchedCount - 1` while a batch loads (footer shows a loading hint).
- Rendering: `visibleSlice(stories, offset, bodyHeight)` — only visible rows become Ink elements.

## StoryListView — `src/ui/StoryListView.tsx`

Presentational windowed list (stories, selected index, height → rows of `StoryRow`). Shared by the feed list and search results (05-search.md). `StoryRow` keeps its single-line format but takes colors/glyphs from `theme` and truncates the title to available width.

## Container rewrite — `src/ui/StoryList.tsx`

Owns: `storyIds`, `stories` (fetched prefix), `selected` (absolute), `status`, `error`, request token. Keys:

| Key | Action |
|-----|--------|
| `j`/`k`, `↓`/`↑` | move selection |
| `←`/`→` | previous/next tab |
| `t`/`n`/`b` | direct feed switch |
| `g g` / `G` | jump to top / bottom of fetched range |
| `enter` | open comments directly (StoryDetail is deleted) |
| `o` | open story URL in browser |
| `/` | search input |
| `r` | refresh current feed (always available, not error-only) |
| `q` | quit |

## Deletion: StoryDetail

`src/ui/StoryDetail.tsx` is removed; `'detail'` leaves the `View` union in `App.tsx`. Story metadata (title, points, author, age, hostname) moves to the comments header (04-comments.md). Supersedes `specs/v1/05-ui-story-detail.md`.
