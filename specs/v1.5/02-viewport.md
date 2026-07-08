# V1.5 — Viewport Math

All scroll-window logic lives in pure functions in `src/lib/viewport.ts` (fully unit-tested; components stay thin). Two variants: fixed-height rows (story lists) and variable-height rows (comments).

## Fixed-height rows (story list, search results)

Each row is exactly one terminal row.

```ts
// Clamp/advance the window start so `selected` stays visible.
// Previous offset passed in; returns new offset. Handles resize shrink for free
// because it is called on every render with the current height.
ensureVisible(offset: number, selected: number, height: number, count: number): number

// The rows to render this frame.
visibleSlice<T>(items: T[], offset: number, height: number): T[]

// True when selection is within `threshold` of the end of fetched items
// and more remain unfetched — triggers the next batch fetch.
shouldFetchMore(selected: number, fetchedCount: number, totalCount: number, threshold: number): boolean
```

Rules:
- Offset is derived per render, stored only as the previous value (state), never adjusted in effects.
- `ensureVisible` invariants: `0 <= offset <= max(0, count - height)`; `offset <= selected < offset + height`.
- Edge cases covered by tests: empty list, `height >= count`, selection at first/last row, terminal shrink below current offset.

## Variable-height rows (comment tree)

Comment bodies wrap; heights differ per row. Key trick: **pre-wrap text in the lib** so every rendered line is exactly one terminal row — heights are exact by construction, the frame can never exceed terminal rows, and the math is unit-testable.

```ts
// Deterministic greedy word-wrap to `width` columns; no ANSI awareness needed
// (styling applied per-line at render).
wrapPlainText(text: string, width: number): string[]

// Line-based analogue of ensureVisible: keeps the selected row's first line visible.
ensureVisibleLines(heights: number[], selected: number, topLine: number, viewportLines: number): number

// Which rows intersect the window, and how many lines to clip at each edge.
sliceByLines(heights: number[], topLine: number, viewportLines: number):
  { first: number; last: number; clipTop: number; clipBottom: number }
```

Render contract: each wrapped line renders as its own `<Text wrap="truncate-end">` so nothing re-wraps inside Ink.

## Ownership

- Phase 2 lands the fixed-height functions (story list).
- Phase 3 adds the line-based functions (comments).
- `src/lib/listNavigation.ts` loses `PAGE_SIZE` / `pageSlice` / `totalPages`; keeps `clampSelection`, `mapFeedKey`; gains `nextFeed` / `previousFeed` (03-story-list.md).
