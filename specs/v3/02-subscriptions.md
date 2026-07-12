# Subscriptions (`src/db/subscriptions.ts` + `hn sub` CLI)

A subscription = named topic watch: Algolia full-text query + optional score threshold. Managed from the CLI (below) and from the TUI's subs tab ([06-subscriptions-tui.md](06-subscriptions-tui.md)); both go through `src/db/subscriptions.ts`.

## Model

```ts
interface Subscription {
  id: number;
  name: string;        // unique label, used in CLI + notification header
  query: string;       // Algolia query string, e.g. "postgres", "rust async"
  minPoints: number;   // 0 = notify on any match
  createdAt: number;
  lastRunAt: number | null;  // watcher window anchor; null = never run
}
```

## CLI (Commander subcommands; kept alongside the TUI for scripting and remote shells)

```bash
hn sub add <name> <query...> [--min-points <n>]
hn sub list
hn sub rm <name>
```

| Command | Behavior |
|---------|----------|
| `add` | Insert; error if name exists (`subscription 'x' already exists`). Query = remaining args joined. `--min-points` default 0 |
| `list` | Table to stdout: name, query, min-points, last run (relative or `never`). Plain text, no TUI |
| `rm` | Delete by name (cascades seen_items). Error if not found. No confirmation — re-add is cheap |

Examples:

```bash
hn sub add postgres postgres --min-points 50
hn sub add zig-lang zig
hn sub list
hn sub rm zig-lang
```

## Matching semantics (used by watcher, [03-watcher.md](03-watcher.md); the TUI matches view uses a fixed 7-day browsing window instead, see [06-subscriptions-tui.md](06-subscriptions-tui.md))

Per subscription, one Algolia call:

```text
GET /search_by_date
  ?query=<query>
  &tags=story
  &numericFilters=created_at_i><lastRunAt or now-24h>,points>=<minPoints>
  &hitsPerPage=50
```

- **`search_by_date`** (not relevance `search`): monitoring wants recency; relevance ranking would shuffle the window.
- **Window:** stories created after `lastRunAt`; first run (null) uses `now - 24h` to avoid flooding history.
- **Points caveat (accepted):** brand-new stories haven't accumulated points yet — a story crossing `minPoints` *after* the window passes is caught on a later run **only if still inside a subsequent window by creation time**, which it isn't. Mitigation spec'd: window lower bound is `max(lastRunAt - 6h, 0)` (6 h lookback overlap) and dedup via `seen_items` prevents repeats. So each run rescans the trailing 6 h for late crossers.
- Query text matching is Algolia's: matches title/body/url tokens. Good enough; no regex/boolean syntax in V3.
- 50 hits/page, no pagination — a personal topic exceeding 50 new matches per window means the query is too broad; note in `sub add` docs.
