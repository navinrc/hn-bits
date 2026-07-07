# hn-bits — Overview

Terminal-first Hacker News client. Personal tool, single user, stateless.

- **App name:** `hn-bits`, **binary:** `hn`
- **Stack:** Node.js (ESM), TypeScript, Ink (React 19 for terminal UI), Commander (entry-point arg parsing only), `open` (browser launch), native `fetch` (no axios)
- **Persistence:** none in V1. No SQLite, no config file.

## V1 scope

1. Browse story lists: top / new / best (Firebase API), paginated.
2. Story detail view with actions: open URL in browser, read comments, back.
3. Comments: flat top-level list, drill into one comment for its reply subtree (Algolia, single request per story).
4. Search: `hn search <query>` and `/` inside the TUI (Algolia search API).

## Out of V1

Ollama / AI anything, article parsing, bookmarks, subscriptions, watcher, Telegram, Discord, SQLite, config command.

## Roadmap

- **V2** ([../v2/00-overview.md](../v2/00-overview.md)): Ollama summaries (article + thread) + Ask AI, article extraction, config file.
- **V3** ([../v3/00-overview.md](../v3/00-overview.md)): subscriptions + watcher (cron one-shot), Telegram notifications, SQLite, bookmarks.

## Spec index

| File | Covers |
|------|--------|
| [01-architecture.md](01-architecture.md) | Module layout, data flow, entry point |
| [02-api-firebase.md](02-api-firebase.md) | Story ID lists + story item fetch |
| [03-api-algolia.md](03-api-algolia.md) | Comment trees + full-text search |
| [04-ui-story-list.md](04-ui-story-list.md) | List view, pagination, feed switching |
| [05-ui-story-detail.md](05-ui-story-detail.md) | Detail view, open-in-browser |
| [06-ui-comments.md](06-ui-comments.md) | Comment reading model, HTML handling |
| [07-search.md](07-search.md) | Search entry points and result flow |
| [08-keybindings.md](08-keybindings.md) | Global keyboard reference |
