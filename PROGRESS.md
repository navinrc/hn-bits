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
| 2: Tabs + continuous list | done | ask/show feeds, viewport.ts (ensureVisible/visibleSlice/shouldFetchMore), TabBar in header, StoryList rewrite (continuous scroll, progressive 30-item batch fetch, request-token guard), StoryDetail deleted (enter opens comments directly), StoryRow pre-truncates title to width |
| 3: Comment tree | done | commentTree.ts (flattenTree/toggleFold/collapseAll/expandAll), viewport.ts gains wrapPlainText/ensureVisibleLines/sliceByLines for variable-height windowing, Comments.tsx rewritten as single inline fold/unfold tree with metadata header, comments.ts loses flattenSubtree (drill-in deleted) |
| 4: Search + help overlay | done | `SearchResults.tsx` rewritten onto `StoryListView` + progressive fetch (Algolia `hasMore`, request-token guard, `totalHits` in header); `]`/`[` paging removed. `SearchInput` renders as a footer-line prompt (`/ query▊`), hosted by `App.tsx`. `src/ui/keymap.ts` is the single `{key,label}[]` source driving both footer hints and the new `?` `HelpOverlay.tsx`; `q`/`?` both suppressed while search input is focused. |
| 5: Reconcile + polish | done | specs/README.md V1.5 marked done, root README rewritten (fullscreen usage + full V1.5 keymap), PR raised |
| 6: Theme palettes | done | Ported heartleo/hn-cli's `colors.go` palettes into `theme.ts`: 6 named ansi256 themes (`hn` default, mocha, dracula, tokyo, nord, gruvbox); `resolveTheme`/`resolvePaletteName` (explicit name > `HN_THEME` env var > `hn`, unknown falls back). `StoryRow` gets color for the first time (title/score/comment/muted) and fixes the emoji-glyph spec drift from phase 1 (`⯅`/`💬` → `theme.glyphs.points`/`.comments`). `--theme <name>` CLI flag + `hn theme` info command; no persistence (config file still deferred to V2) |

V1.5 is now feature-complete against `specs/v1.5/`.

## V1.6 — Visual rework (specs/v1.6/)

Two-line story rows + comments view redesign (bordered cards, collapsed-by-default threads), requested against a mockup with no prior spec coverage.

| Phase | Status | Notes |
|-------|--------|-------|
| Specs | done | specs/v1.6/01-02 committed; specs/README.md + PROGRESS.md updated |
| 1: Story row layout | pending | matches specs/v1.6/01-story-row-layout.md |
| 2: Comments rework | pending | matches specs/v1.6/02-comments-rework.md |

## Known gaps / follow-ups

- V1.6 code not yet implemented (specs only). Next up: implement V1.6 phases 1–2, then V2 (local AI, Ollama) per `specs/v2/`.
