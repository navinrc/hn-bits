# V3 — Radar (subscriptions, watcher, notifications, bookmarks)

Turns the reader into the "radar" from the original concept: subscribe to topics, a cron-driven one-shot watcher finds new matching stories, Telegram delivers them. SQLite arrives as the first database (subscriptions, dedup, bookmarks).

Prerequisites: V1 complete; V2 config file exists ([../v2/01-config.md](../v2/01-config.md)) — V3 extends the same file.

## V3 scope

1. **SQLite storage** — `better-sqlite3`, single DB file; tables: `subscriptions`, `seen_items`, `bookmarks`.
2. **Subscriptions** — named topic queries (Algolia query + min-points), CRUD via `hn sub` CLI.
3. **Watcher** — `hn watch --once`: query each subscription, dedup, notify, exit. Scheduled by the OS (cron/launchd), not a daemon.
4. **Telegram notifications** — bot API `sendMessage`; notifier interface keeps Discord addable later.
5. **Bookmarks** — `B` toggles bookmark on a story; `hn bookmarks` lists them in the TUI.

## Out of V3

Discord (interface-ready, not implemented), long-running daemon mode, notification digests/batching windows, comment-level subscriptions, read-state tracking, multi-user anything, web UI.

## Process model

Deliberate grilling decision: **no daemon**. `hn watch --once` does one pass and exits; cron owns scheduling. Zero supervision, zero idle cost, failure = next run retries.

## End-to-end flow

```mermaid
flowchart LR
    CRON[cron every 30 min] --> W[hn watch --once]
    W --> DB[(SQLite)]
    DB -->|subscriptions| Q[Algolia search_by_date<br/>per subscription]
    Q --> F[filter: min points,<br/>not in seen_items]
    F -->|new matches| N[Telegram sendMessage]
    N -->|sent ok| S[record in seen_items]
    F -->|nothing new| X[exit 0]
    subgraph TUI
        B[B key → bookmark] --> DB
        BM[hn bookmarks] --> DB
    end
```

## New dependency

| Package | Why |
|---------|-----|
| `better-sqlite3` | synchronous, zero-config embedded DB; ideal for one-shot CLI (no pool/async ceremony) |

## New modules

```text
src/
├── db/
│   ├── db.ts            # open + migrate
│   ├── subscriptions.ts
│   ├── seen.ts
│   └── bookmarks.ts
├── notify/
│   ├── notifier.ts      # interface
│   └── telegram.ts
└── watch.ts             # hn watch --once entry
```

## Spec index

| File | Covers |
|------|--------|
| [01-storage.md](01-storage.md) | DB location, schema DDL, ER diagram, migrations |
| [02-subscriptions.md](02-subscriptions.md) | Topic model, `hn sub` CLI, matching semantics |
| [03-watcher.md](03-watcher.md) | `hn watch --once` flow, dedup, cron setup, exit codes |
| [04-notifications.md](04-notifications.md) | Notifier interface, Telegram implementation |
| [05-bookmarks.md](05-bookmarks.md) | `B` key, `hn bookmarks` view |
