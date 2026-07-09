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
| 1: Story row layout | done | `theme.ts` gains `selectionBackground` (shared across palettes) and `glyphs.upvote`, drops `points`/`comments` glyphs, `selection` glyph is now `>`; `StoryRow` renders the two-line card (title + hostname on row 1, score/author/age/comments on row 2, row 1 highlighted full-width on selection); `StoryList`/`SearchResults` move from `ensureVisible`/`visibleSlice` to `ensureVisibleLines`/`sliceByLines`, and `StoryListView` clips a partial edge row down to its title line, never its meta line |
| 2: Comments rework | done | `CommentsHeader` is a bordered card (title / score-author-age-comments / url); tree is `collapseAll`'d on load instead of starting expanded; `buildRow` no longer short-circuits a folded node's body, and every node with replies shows a right-aligned "N replies"/"1 reply" badge regardless of fold state; the selected comment renders inside a bordered card instead of `inverse` highlighting |
| 3: Fix footer-wrap bug found during live verification | done | `Layout.FOOTER_ROWS` was hardcoded to `1`, but the footer hint text actually wraps to 2 rows at common terminal widths — with the new 2-line story rows that 1-line miscount corrupted the whole list (meta text bleeding into title lines). Replaced with `keymap.footerRows(keys, width)` (via `wrapPlainText`); dead `FOOTER_ROWS` constant removed. Confirmed live under tmux at 80/100/140 columns — pre-existing bug, not new to V1.6, just newly visible once row height stopped being 1. |
| Polish specs (from demo-browse.gif review) | done | specs/v1.6/03-05 committed: tab bar redesign (brand + tab-notch active box + `? help`, header 3 rows), story list polish (right-aligned ranks, blank separator line, selection covers both lines, `❯` marker), animated braille loading indicator |
| 4: Tab bar redesign | done | matches specs/v1.6/03-tab-bar.md; `Layout.HEADER_ROWS` 1→3, `TabBar` rewritten to build 3 plain-string rows (top border / brand+tabs+`? help` / notch rule) with the active tab's box walls tracked by column so the rule notch aligns exactly under it at any width; verified live via tmux at 100 and 70 columns switching tabs |
| 5: Story list polish | done | matches specs/v1.6/04-story-list-polish.md; `STORY_ROW_HEIGHT` 2→3 (blank separator line), rank right-aligned to `String(stories.length).length` via new `rankWidth` prop, `theme.glyphs.selection` `>`→`❯`, selection background now covers both title and meta lines (full width); `StoryListView` clip priority reworked to line-count-based (separator drops first, then meta, title always last standing) |
| Bugfix: selected-row content reaching exact terminal width corrupts the row below | done | title/hostname (or, for short titles, the selection-highlight padding) could sum to exactly the terminal width; that triggers a VT100 delayed-wrap that Ink's cursor math doesn't account for, silently dropping the next row's background paint. Fixed by reserving 1 trailing column (`safeWidth = width - 1`) for both truncation and padding math in `StoryRow`. Root-caused via `tmux capture-pane -e` byte-level diffing across ~20 isolated repros (ruled out glyph unicode-width, rerender/diffing races, and rank-width churn before isolating it to exact-width-fill); regression test in `StoryRow.test.tsx` (verified red without the fix, green with it) |
| 6: Loading indicator | done | matches specs/v1.6/05-loading-indicator.md; new shared `LoadingIndicator.tsx` (braille spinner, 80ms/frame, `useState`+`useEffect` interval, cleaned up on unmount) replaces the bare `loading…` text in `StoryList`, `Comments`, `SearchResults` with per-call-site labels ("Loading stories...", "Loading comments...", "Searching..."); `loading more…` footer line left as plain text per spec. Verified live via tmux (spinner glyph + label visible on cold start and on opening comments) |
| Comments polish specs (from expected-view mockups) | done | specs/v1.6/06-comments-polish.md committed: tab-notch color consistency, comment header colors + inline `[N more]`/`N replies` badge, header-only fold state with C/E rework (full-tree expand removed), URL/email highlighting (shared `link`/`email` semantic colors), selection left-bar + background stripe |
| 7: Comments polish | pending | implementation of specs/v1.6/06-comments-polish.md |

## Known gaps / follow-ups

- V1.6 phase 7 implementation (specs/v1.6/06-comments-polish.md).
- Then V2 (local AI, Ollama) per `specs/v2/`.
