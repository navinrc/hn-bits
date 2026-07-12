# Subscriptions TUI (the `subs` tab)

TUI surface for the subscriptions of [02-subscriptions.md](02-subscriptions.md): browse, create, edit and delete topic watches without leaving the app, plus browse recent matches per topic. The `hn sub` CLI stays (scripting, remote shells, watcher parity); CLI and TUI share `src/db/subscriptions.ts`.

## Tab

Subscriptions are a 7th tab after Saved: `Top New Best Ask Show Saved Subs`. Reached like any tab (`←/→`); `hn subs` opens the TUI with the subs tab active (same pattern as `hn bookmarks`).

- `TabBar`'s `active` prop widens from `Feed | 'saved'` to `Feed | 'saved' | 'subs'` (`TABS` gains the entry; notch math unchanged).
- `App.tsx` `View` union gains `{ name: 'sub-matches'; subscription: Subscription }` and `{ name: 'sub-form'; mode: 'add' | 'edit'; subscription?: Subscription; prefillQuery?: string; returnTo: View }`. The manager itself is the tab body (like `list` for feeds), not a pushed view.
- Components: `SubscriptionsView.tsx` (manager), `SubscriptionMatches.tsx` (matches), `SubscriptionForm.tsx` (add/edit) in `src/ui/`.

## Manager screen (tab body)

```text
                                                          ╭──────╮
  Hacker News   Top   New   Best   Ask   Show   Saved     │ Subs │    ? help
──────────────────────────────────────────────────────────╯      ╰──────────

  ❯  postgres      "postgres"       ≥50 pts    added 12d ago
     zig-lang      "zig"            any        added 30d ago

 j/k move · ←/→ tab · enter matches · a add · e edit · d delete · q quit · ? help
```

- Data source: `listSubscriptions()` (local SQLite, no network). Row = name, quoted query, min-points (`any` when 0), created age.
- Keys (`SUBS_KEYS` in `src/ui/keymap.ts`; footer + `?` overlay come free):

| Key | Action |
|-----|--------|
| `j/k` | move selection |
| `←/→` | tab |
| `t/n/b` | jump to feed (as on every tab) |
| `enter` | open matches view for selected sub |
| `a` | add subscription (opens form) |
| `e` | edit selected subscription (opens form pre-filled) |
| `d` | delete selected, with inline footer confirm `delete 'postgres'? y/n` (TUI keypresses fat-finger easily; CLI `rm` stays confirm-free) |

- Empty state: `no subscriptions yet - press a to add` (centered, muted, same slot as a feed's loading indicator).
- No unread counts or badges: the manager renders from SQLite alone, zero Algolia calls on open.

## Matches view (`enter` on a subscription)

Browsing feed for one topic, fetched live. Deliberately **not** the watcher's window semantics ([03-watcher.md](03-watcher.md)): browsing wants a stable recency window, notifications want since-last-run. The TUI never reads or writes `seen_items` or `lastRunAt`.

One Algolia call per open/refresh:

```text
GET /search_by_date
  ?query=<query>
  &tags=story
  &numericFilters=created_at_i>=<now - 7d>,points>=<minPoints>
  &hitsPerPage=50
```

- Last 7 days, newest first, 50 hits cap, no pagination (same "query too broad" stance as 02).
- Renders via **`StoryListView`** behind a small fetch container (the `SearchResults` pattern), title line shows `sub: <name> "<query>"`.
- Keys (`SUB_MATCHES_KEYS`), full parity with other story lists:

| Key | Action |
|-----|--------|
| `j/k`, `gg/G` | move / top-bottom |
| `enter` | comments |
| `o` | open in browser |
| `B` | toggle bookmark |
| `s` | summary |
| `a` | ask ai |
| `r` | refetch |
| `esc` | back to manager |

- Empty state: `no matches in the last 7 days`.

## Add/edit form with live preview

Full-screen form view (`sub-form`). While it is open, global `q`/`?` step aside so keystrokes reach the inputs (same rule as the Ask AI view).

```text
  New subscription

  name:        rust-async▏
  query:       rust async
  min points:  50

  preview (last 7 days, ≥50 pts):
   1. Tokio 1.40 released                          210 pts
   2. Async closures stabilized                     98 pts
   3. Show HN: cancellation-safe channels           61 pts

 tab next field · enter save · esc cancel
```

- Fields: `name`, `query`, `min points` (integer ≥ 0, default 0). `tab` cycles fields, `enter` saves, `esc` cancels back to `returnTo`.
- **Live preview**: whenever `query` or `min points` change, a debounced (300 ms) Algolia call with the exact matches-view semantics above renders up to 5 rows below the form. The user sees what the subscription would catch before saving; empty query shows no preview.
- Validation on save, inline error line under the form: name non-empty and unique (`subscription 'x' already exists`), query non-empty.
- Edit mode: pre-filled from the subscription, rename allowed (updates are id-keyed). Requires `updateSubscription` in `src/db/subscriptions.ts` ([01-storage.md](01-storage.md)).
- Keys (`SUB_FORM_KEYS`): `tab` next field, `enter` save, `esc` cancel.

## Promote from search

`S` (capital) in **search results** opens the form in add mode with `query` pre-filled from the current search and focus on `name`. Ran a search, liked what it returned, one key turns it into a standing topic. `S` joins `SEARCH_RESULTS_KEYS` (`S subscribe`); saving or cancelling returns to the search results.

## Non-goals (V3)

Unread counts/badges, TUI access to `seen_items`, persisting matches, per-sub notification toggles in the TUI, boolean/regex query syntax, match pagination, subscribing from feed lists (search results only; run `/` first).
