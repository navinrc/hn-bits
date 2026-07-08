# Progress

Tracks implementation phases against `specs/`. Updated after each meaningful phase (CLAUDE.md rule 14).

## V1

| Phase | Status | Notes |
|-------|--------|-------|
| API: firebase.ts | done | matches specs/v1/02-api-firebase.md |
| API: algolia.ts | done | matches specs/v1/03-api-algolia.md (unused until search/comments land) |
| UI: StoryList (tracer bullet) | done | feeds top/new/best, pagination, j/k/o/t/n/b/[/], enter opens StoryDetail |
| UI: StoryDetail | done | title/domain/metadata, o opens browser, esc/b back, enter/c opens Comments |
| UI: Comments | done | flat top-level list + one level of reply drill-in, htmlToText rendering, j/k/enter/esc |
| Search | done | `hn search <query...>` CLI entry, `/` in-TUI entry, reuses StoryRow, esc back/quit per entry point |

V1 is now feature-complete against `specs/v1/`.

## V1.5 — UI overhaul (specs/v1.5/)

Inspired by heartleo/hn-cli: fullscreen TUI, tab bar (5 feeds), continuous scroll, inline fold/unfold comment tree. Sanctioned keybinding break (see specs/v1.5/06-keybindings.md).

| Phase | Status | Notes |
|-------|--------|-------|
| Specs | done | specs/v1.5/00–07 committed; specs/README.md ground rule amended |
| 1: Fullscreen shell | done | alt screen (TTY-only), Layout (Screen/Header/Body/Footer), theme.ts, vendored Ink test harness, `q`-in-search-input bug fix + regression test |
| 2: Tabs + continuous list | pending | ask/show feeds, viewport.ts, StoryDetail deleted, pagination removed |
| 3: Comment tree | pending | commentTree.ts fold ops, line-based viewport, metadata header |
| 4: Search + help overlay | pending | StoryListView reuse, keymap.ts, `?` overlay |
| 5: Reconcile + polish | pending | spec status, README keybindings, PR |

## Known gaps / follow-ups

- Comments view renders the full top-level list with no virtualized scrolling; relies on the terminal's native scrollback for long threads. Revisit if this proves painful in practice.
- No Ink component rendering tests yet; only pure logic (`src/lib/*`) is unit tested.
- Search has no filters, no `search_by_date`, no comment search, no history (all explicit V1 non-goals per specs/v1/07-search.md).
