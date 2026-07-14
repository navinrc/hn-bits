# Topic-less subscriptions and always-24h watcher window

Two subscription shapes the user wants:

1. Any story with points >= 250 OR comments >= 100, no topic filter.
2. Any story about "india" (works today: `hn sub add india india`).

Shape 1's matching already exists end-to-end: `searchRecent` (`src/api/algolia.ts`) pushes
`created_at_i>X AND (points>=N OR num_comments>=M)` server-side, and Algolia treats an empty
`query` as match-all. Only input validation blocks it: the CLI requires `<query...>`
(`src/index.tsx`) and the TUI form rejects an empty query (`src/ui/SubscriptionForm.tsx`).

Separately, the watcher window is 24h on a sub's first run but only `lastRunAt - 6h` after
that (`src/watch.ts`), so a story that crosses a threshold more than ~6h after creation is
never caught. Decision: always scan the last 24h; per-(story, sub) `seen_items` rows (never
pruned) keep re-notification impossible.

Prerequisites: V3 subscriptions/watcher, min-comments OR threshold (commit 291c679).

## Design

* CLI: `sub add <name> [query...]`. Empty query with both thresholds 0 is rejected
  ("query or at least one threshold (--min-points/--min-comments) required"); an empty sub
  would match every story.
* TUI form: same rule, error "query or a threshold is required". Live preview also runs for
  an empty query when a threshold is set.
* Display: empty query renders as `(any)` in `hn sub list`, the subs TUI list, and the
  matches header. Shared helper `queryLabel` beside `thresholdLabel` in
  `src/lib/subscriptionLabel.ts`.
* Watcher: `windowStart` returns `now - 24h` unconditionally; drop the `SIX_HOURS` rescan
  overlap. `touchLastRun` unchanged (feeds `sub list` display and its existing contract).
* `hitsPerPage` in `fetchMatches` bumped to 100: a broad sub can exceed 50 hits over a full
  day. `search_by_date` is newest-first, so truncation only drops the oldest (already-seen)
  stories.

Known one-time effect: the first run after the window change may notify for unseen stories
from the past 24h; seen rows block repeats afterwards.

## Changes

| Phase | Status | Notes |
|-------|--------|-------|
| 1: optional query (CLI + TUI + display) | done | `sub add <name> [query...]` with empty-query guard; form validates "query or a threshold"; preview runs on empty query once a threshold is set; `queryLabel` renders `(any)` in `sub list`, subs TUI, and matches header |
| 2: always-24h window + hitsPerPage 100 | done | `windowStart(now)` unconditional 24h, `SIX_HOURS` dropped, `hitsPerPage: 100` in `fetchMatches`; regression-tested by temp-reverting to a 6h window (window test failed, then restored) |
