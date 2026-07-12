# Min-comments threshold (OR with min-points)

Subscriptions currently gate on one threshold: `minPoints` (0 = any). A low-scored story with a hot
discussion never crosses it. Adds a second, independent threshold — `minComments` — combined with the
existing one via **OR**: e.g. `Apple: ≥20 pts OR ≥5 comments`. A story needs to clear only one side.

Prerequisites: V3 (`specs/v3/02-subscriptions.md`, `06-subscriptions-tui.md`). Independent of V3.1/V3.5/V3.6.

`num_comments` is already returned by the HN Algolia API on every search hit and already parsed into
`Story.descendants` (`src/api/algolia.ts`) — no new upstream data required.

## Model

```ts
interface Subscription {
  id: number;
  name: string;
  query: string;
  minPoints: number;    // 0 = no points floor
  minComments: number;  // 0 = no comments floor; new column, default 0
  createdAt: number;
  lastRunAt: number | null;
}
```

DB: additive migration, `ALTER TABLE subscriptions ADD COLUMN min_comments INTEGER NOT NULL DEFAULT 0;`.
Existing rows default to 0 — see matching semantics below for why that's a no-op for them.

## Matching semantics

```text
passes(story, minPoints, minComments):
  if minPoints == 0 and minComments == 0: true        # today's "any" default, unchanged
  pointsOk   = minPoints   > 0 and story.score       >= minPoints
  commentsOk = minComments > 0 and story.descendants >= minComments
  return pointsOk or commentsOk
```

Strict generalization of today's behavior: any subscription with `minComments == 0` (every
subscription that predates this feature) behaves exactly as before — a single AND'able points floor.
OR only activates once both thresholds are set to non-zero.

**Why two server-filtered requests unioned, not Algolia `numericFilters` OR-groups or a single
unfiltered fetch:** Algolia supports OR via nested-array `numericFilters` syntax, but that's
unverified against the live `hn.algolia.com` endpoint and adds query-encoding complexity for no
real gain. The first cut instead fetched one page with no server-side floor at all and filtered
`passes()` client-side — but for high-volume queries that undercounts badly: the top-50-by-recency
*unfiltered* pool gets crowded out by brand-new, zero-engagement submissions, pushing older
qualifying stories outside the window before the OR check ever runs (e.g. `Claude Code: >=30 pts
OR >=1 comment` returned 2 matches instead of the 5+ that individually satisfy each side).

- If only one threshold is active, push the matching server-side `numericFilters` entry
  (`points>=N` or `num_comments>=N`) exactly as `points>=N` is pushed today — zero payload change
  for existing single-threshold subscriptions.
- If both are active, run two requests in parallel — one with `points>=N`, one with
  `num_comments>=M` — each hitting the full 50-hit server-side cap like the single-threshold case
  does, then union by story id (dedup), sort by recency, and trim to the caller's requested limit.

Single change point in `src/api/algolia.ts`'s `searchRecent` — `watch.ts`, `SubscriptionMatches.tsx`,
and `SubscriptionForm.tsx`'s live preview all pick this up by passing `minComments` through, no
duplicated filter logic elsewhere. Costs one extra HTTP request only when both thresholds are set.

## CLI

```bash
hn sub add <name> <query...> [--min-points <n>] [--min-comments <n>]
```

`--min-comments` mirrors `--min-points`: non-negative integer, default 0. `hn sub list` extends the
per-row threshold label:

```text
any                  # both 0
≥20 pts              # points only
≥5 cmts              # comments only
≥20 pts or ≥5 cmts   # both — OR
```

No `hn sub edit` — editing stays TUI-only via `updateSubscription`, consistent with today's CLI
surface (`add`/`list`/`rm`).

## TUI

`SubscriptionForm.tsx` gains a 4th field, `min comments`, same tab position after `min points`,
same digit-only input handling as the existing `minPoints` field. Live preview (debounced Algolia
call) threads `minComments` through and its label reflects the OR when both thresholds are set,
e.g. `preview (last 7 days, ≥20 pts or ≥5 cmts):`.

`SubscriptionsView.tsx`'s manager row label uses the same four-way logic as the CLI's `sub list`.

`SubscriptionMatches.tsx` threads `subscription.minComments` into its `searchRecent` call — no
other change; it already renders whatever `searchRecent` returns.

## Out of scope

`hn sub edit` CLI command, Algolia native OR-group `numericFilters` (revisit if hit volume ever
needs the 50/page cap raised), a third threshold dimension, editing the OR into a user-configurable
AND/OR toggle (OR is the only mode — if someone wants AND-only behavior, set just one threshold).
