# V1.5 — Search in the Shell

Entry points unchanged from V1 (`hn search <query...>` CLI, `/` in TUI). What changes: rendering inside the fixed shell and paging model.

## Search results — `src/ui/SearchResults.tsx` (rewrite)

- Reuses `StoryListView` (03-story-list.md) for windowed rendering; same `StoryRow` format.
- Header: `search: <query>` + result count when known.
- Paging: `[`/`]` keys die. Progressive fetch like the feed list — when `shouldFetchMore` trips and Algolia `hasMore`, fetch the next page and append. Request token guards stale responses when the query changes.
- `enter` opens comments directly (metadata for the header comes from the search hit's `Story`).
- `esc`: back to list (TUI entry) or quit (CLI entry) — unchanged V1 semantics.

## Search input — `src/ui/SearchInput.tsx` (light modify)

Keystroke-accumulating logic unchanged. Renders inside the shell as a footer-line prompt (`/ query▊`) instead of a bare full-screen line. Global keys (`q`, `?`) are suppressed while active (01-shell.md bug fix).

## Keys (results view)

| Key | Action |
|-----|--------|
| `j`/`k`, `↓`/`↑` | move selection |
| `g g` / `G` | top / bottom |
| `enter` | open comments |
| `o` | open in browser |
| `/` | new search |
| `esc` | back / quit per entry point |
| `q` | quit |
