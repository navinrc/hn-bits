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
| 7: Comments polish | done | matches specs/v1.6/06-comments-polish.md; `TabBar` notch (`╭─╮`/`│` walls/`╯╰`) renders fully in `accent`, rest stays `dimColor`; `commentTree.ts` gains a second `headerOnly: Set<id>` alongside `folded`, `flattenTree` takes both, `collapseAll`/`headerOnlyAll` replace `expandAll` (`C` → header-only every node, `E` → reset to default collapsed, space/enter reveals a header-only row without touching its children's state); comment rows render as accent-glyph/bold-author/muted-age/muted-badge spans with an inline `[N more]`/`N replies` badge (`theme.ts` unaffected — colors are per-span, not new theme keys); new `src/lib/contactHighlight.ts` (`tokenizeContacts`) colors bare URLs/emails found by `htmlToText` using two new shared theme colors (`link`/`email`); selection is now an accent `▌` bar + `selectionBackground` stripe (bordered-card selection from phase 2 removed) |
| Bugfix: long story URL corrupts the comments frame on load | done | `Comments.tsx`'s `headerLines` constant assumed the bordered header card is always 3 interior lines, but a URL longer than the card's interior width word-wraps to 2 lines; undercounting that let `viewportLines` render one comment row too many, overflowing the terminal and triggering a real-TTY auto-scroll that desyncs Ink's cursor-relative redraw (title row and the first comment's header line got overwritten/dropped — invisible in the `ink-testing-library` harness since `FakeStdout` doesn't emulate real cursor movement, only reproduced live via `tmux capture-pane -e` on a story with a long URL). Replaced the hardcoded constant with `commentsHeaderLines()`, which wraps the title and url through `wrapPlainText` at the card's actual interior width. Regression test in `Comments.headerLines.test.ts` (verified red against the old hardcoded formula, green with the fix); confirmed live via tmux at 80/100/140 columns. |
| Phase 8 specs (from screenshot review 2026-07-09) | done | specs/v1.6/07-navbar-selection-fold.md committed: full-accent tab-bar bottom rule (supersedes 06 §1 color split), unbroken selection bar (exact-width delayed-wrap, `safeWidth` reserve as in the StoryRow exact-width fix above), C-mode leaf reveal becomes header↔body toggle via tracked `revealed` set (also codifies shipped two-step reveal that 06 §3 described as one press). "Load more" hint line considered and dropped during spec grilling |
| 8: Navbar rule, selection bar, leaf collapse | done | matches specs/v1.6/07; `TabBar.buildBottomRuleSegments` now emits the whole rule (dashes + `╯ ╰` notch) as one accent segment; `Comments.buildRow` reserves 1 trailing column (`columns - 1`, same `safeWidth` treatment as StoryRow) so a selected row's bar/stripe never hits the exact-width VT100 delayed-wrap — regression test in `Comments.test.tsx` uses a 300-char unbroken body (padding-only probes don't work: unstyled trailing spaces are trimmed in the test harness, only real content reaches the edge), verified red with fix temp-reverted, green with it; `commentTree.ts` `revealHeaderOnly` now moves ids into a tracked `revealed` set (new `RevealState`) and new `rehideRevealed` moves a leaf back, wired in `Comments.toggleSelected` (revealed leaf toggles back to header-only; default-view leaves stay no-op; parents keep child-fold toggle), `C`/`E`/`r` reset the set. Verified live via tmux at 100 cols: full-accent rule (single 208-color segment), bar+stripe unbroken across wrapped/blank lines of a long selected comment, C-mode leaf header↔body toggle both directions, parent two-step reveal intact |

## Spec reconciliation — v2/v3 vs shipped v1.6 (2026-07-09)

v2/v3 specs were written against original V1, before v1.5/v1.6 shipped. Audit found data-layer contracts (`Story`, `CommentNode`, `fetchComments`, `lib/html.ts`) intact, UI anchors stale. Both spec sets rewritten to the v1.6 baseline:

| Change | Where |
|--------|-------|
| `s` summary + `a` Ask AI relocated off deleted StoryDetail: `s` in list = article (text posts: post `text`, else thread fetch + notice), `s` in comments = thread; `a` from list (fetches thread on demand) or comments | v2/00, 04, 05 |
| `ai/context.ts` added to module tree; `Story.text?` + `keymap.ts` touch points noted | v2/00 |
| Bookmarks: 6th `Saved` tab in TabBar (`hn bookmarks` opens on it), reuses `StoryListView` + continuous scroll (paging refs deleted), `★` moves to meta line, `B` in list + comments, mockup redrawn to 3-line rows / notch header / keymap footer | v3/00, 05 |

## Spec revision - v3 subscriptions TUI + Saved s/a parity (2026-07-12)

Grilling session on v3 UX. Decisions and spec changes (no code):

| Change | Where |
|--------|-------|
| Subscriptions get a TUI: 7th `Subs` tab = manager (list/add/edit/delete, no unread counts), `enter` = per-topic matches (live Algolia, fixed 7-day window, full `s`/`a`/`B` key parity), add/edit form with debounced live preview, `S` in search results = subscribe-from-search. CLI `hn sub` stays; both share `db/subscriptions.ts` (gains `updateSubscription`) | new v3/06; v3/00, 01, 02 |
| Saved tab gains `s`/`a` on the list itself via a `SavedList` container around `StoryListView` (bare `StoryListView` has no `useInput`, so the original spec silently lacked summary/Ask AI there) | v3/05, 00 |
| TUI never touches `seen_items`/`lastRunAt`: watcher owns notification state, TUI browsing is stateless fetch. Unread counts explicitly out of V3 | v3/00, 06 |

## Spec restructure - V3 split into slices (2026-07-12)

V3 slimmed to its radar core (subscriptions CLI+TUI, watcher, Telegram, SQLite, bookmarks); optional channels extracted, plus a new small slice for theme persistence. No code.

| Change | Where |
|--------|-------|
| macOS desktop notifications (alerter binary, sh wrapper, best-effort/at-most-once semantics, exit-2 gate widening) extracted to V3.5; v3 watcher/notifications/overview now telegram-only with pointers | new v3.5/01; v3/00, 03, 04 |
| Discord extracted from "out of V3, interface-ready" to V3.6: webhook transport (not bot API), `discord.{enabled,webhookUrl}` config (webhookUrl masked), telegram failure semantics | new v3.6/01 |
| Theme persistence spec'd as V3.1: `ui.theme` config key validated against `paletteNames()`, precedence flag > env > config > default, `hn theme` shows source | new v3.1/01 |
| specs/README status table: V2/V2.5 marked done (were stale/missing), rows added for V3.1/V3.5/V3.6 | specs/README.md |

## V2 — Local AI (specs/v2/)

Summaries (`s`) and Ask AI (`a`) grounded in the story's article + comment thread, streamed from a local Ollama instance. No cloud calls, no API keys.

| Phase | Status | Notes |
|-------|--------|-------|
| 1: Config + Ollama client | done | `lib/config.ts` (`$HN_BITS_CONFIG` or `~/.config/hn-bits/config.json`, deep-merge defaults, invalid JSON warns and degrades to absent — never crashes); `ai/ollama.ts` (`chatStream` NDJSON streaming over `/api/chat`, `checkOllama` health probe via `/api/tags`, typed error taxonomy `OllamaDownError`/`ModelMissingError`/`OllamaError`/`TimeoutError` with a shared `describeError` hint renderer, 60s idle timeout, clean exit on caller abort). Verified live against a running Ollama (llama3.2): health check + streamed chat |
| 2: Article extraction | done | `lib/article.ts`: `@mozilla/readability` + `jsdom` (lazily imported so plain-reader startup stays fast), 15s timeout, 2MB response cap, `ExtractionError` reasons (`fetch-failed`/`not-html`/`unreadable`), 16k-char truncation at a paragraph boundary. Verified live against a real article URL |
| 3: Summaries (`s`) | done | `ai/context.ts` (`buildThreadContext`: depth-≤2 replies, 1k-char per-comment cap, 12k-char thread budget, always includes at least one top-level comment); `ai/summaryPrompts.ts` (list-mode fallback chain: article → post text → thread, each with a notice; comments-mode summarizes the already-loaded tree); `ui/SummaryPanel.tsx` (bordered streaming panel, setup-hint/preparing/thinking/streaming/done/error states, `esc` close · `s` regenerate · `j`/`k` scroll); wired into `StoryList`, `SearchResults`, `Comments`. `Story` gains optional `text?` for the text-post fallback. Verified live via tmux: article summary (with real extraction + truncation notice) and thread summary both streamed correctly |
| 4: Ask AI (`a`) | done | `ai/context.ts` gains `buildAskAIContext` (story metadata + article text + trimmed thread, reusing `buildThreadContext`); `ui/AskAI.tsx` full-screen chat view — health check on open (down/model-missing render as an immediate hint), article extraction with post-text/unavailable-reason fallback, thread fetched on demand from the list (reused as-is when opened from Comments), multi-turn history sent as `[system+context, ...history, new turn]`, `esc` contextual (abort mid-stream vs. leave when idle), `ctrl+c` quits. `App.tsx` gains an `ask` view (`NonAskView`-typed `returnTo`); global `q`/`?` step aside for it so keystrokes reach the chat input. Verified live via tmux: multi-turn Q&A grounded in both the extracted article and real thread sentiment, `esc` returned cleanly to the list |

V2 is feature-complete against `specs/v2/`. Not yet done: everything in v2/00's "Out of V2" list (bookmarks/subscriptions/watcher/notifications/SQLite are V3; no cloud providers; no chat/summary persistence).

## V2.5 — Config CLI (specs/v2.5/)

Small slice between V2 and V3: hand-editing nested JSON for a Telegram bot token is worse than a few CLI commands, so this ships ahead of the rest of V3.

| Phase | Status | Notes |
|-------|--------|-------|
| 1: `hn config get/set/unset/list` | done | matches `specs/v2.5/01-config-cli.md`; `Config` interface (`lib/config.ts`) gains optional `telegram.{enabled,botToken,chatId}` and `desktopNotifications.{enabled,timeoutSeconds}` (`timeoutSeconds` defaults to 10 only when the section is present), `configPath()` exported; new `lib/configKeys.ts` (whitelisted `CONFIG_KEYS` schema, `parseValue`/`formatValue` with masking for `sensitive` keys) and `lib/configStore.ts` (`readRawConfig`/`writeRawConfig` — first write path this app has had, `getConfigValue`/`setConfigValue`/`unsetConfigValue`/`listConfigEntries`); wired into `src/index.tsx` as a headless `config` subcommand (`hn theme` pattern — plain `console.log`, no Ink). Reverses `specs/v2/01-config.md`'s "no `hn config` subcommand" decision; `specs/v3/04-notifications.md` updated so Telegram activation is explicit `telegram.enabled` (symmetric with `desktopNotifications.enabled`) rather than bare section presence. Verified: `npm test` (24 new/updated tests across `config.test.ts`/`configStore.test.ts`, 190 total passing), `npm run build`, and live CLI round-trips (`set`/`get`/`unset`/`list`, masking, unknown-key/bad-type/missing-arg all exit 1) |

V2.5 is feature-complete against `specs/v2.5/`.

## V3 — Radar (specs/v3/)

Subscriptions (CLI + subs tab TUI) + watcher + Telegram + SQLite + bookmarks.

| Phase | Status | Notes |
|-------|--------|-------|
| 1: SQLite storage | done | `better-sqlite3`, WAL mode, `$HN_BITS_DB` override (default `~/.local/share/hn-bits/hn-bits.db`); `db/db.ts` (`openDb`/`resetDbCache`, `PRAGMA user_version` migrations, cached handle per resolved path); `db/subscriptions.ts`, `db/seen.ts`, `db/bookmarks.ts` — thin prepared-statement modules, no ORM. Matches `specs/v3/01-storage.md` schema exactly |
| 2: `hn sub` CLI | done | `add`/`list`/`rm` Commander subcommands in `src/index.tsx`, headless (plain `console.log`); duplicate-name and not-found both exit 1 |
| 3: Bookmarks | done | `toggleBookmark` wired into `StoryList`/`SearchResults`/`Comments`/new `SavedList.tsx` via `B`; new `useFlash.ts` hook drives the transient "bookmarked ✓"/"bookmark removed" line (reserves 1 status row, same pattern as `loading more…`); `StoryRow` shows a `★` prefix (new `theme.glyphs.bookmark`) on the meta line. 6th **Saved** tab added to `TabBar`/`App`; `←/→` tab cycling generalized from `Feed`-only to `lib/listNavigation.ts`'s `TabId` (`nextFeed`/`previousFeed` → `nextTab`/`previousTab`, `TAB_ORDER` gains `'saved'`). `hn bookmarks` opens the TUI on Saved. New `src/test/dbHarness.ts` (`useTempDb`) keeps every story-list test off the real user DB |
| 4: Notifier + Telegram | done | `notify/notifier.ts` (`Match`/`Notifier` interface — later channels are one-file additions); `notify/telegram.ts` (HTML `sendMessage`, escaped title/author, story link omitted for text posts, single 429 retry honoring `retry_after`, `NotifyError` otherwise) |
| 5: Watcher | done | `api/algolia.ts` gains `searchRecent` (`search_by_date` + `numericFilters`, shared `hitToStory` mapping with `searchStories`); `src/watch.ts` — sequential per-subscription pass, `max(lastRunAt-6h, 0)` / `now-24h` first-run window, dedup via `seen_items` before send, `markSeen` only after a successful send, `touchLastRun` only on query success, `--dry-run` full pipeline zero writes; exit 0/1/2 and log format per spec. `hn watch --once [--dry-run]` in `src/index.tsx` (`--once` Commander-required) |
| 6: Subscriptions TUI | done | 7th **Subs** tab (`TAB_ORDER` gains `'subs'`): `SubscriptionsView.tsx` (manager — local list, `enter` matches, `a`/`e`/`d` add/edit/delete with inline `y/n` confirm), `SubscriptionMatches.tsx` (fixed 7-day window via `searchRecent`, full story-list key parity incl. `B`/`s`/`a`), `SubscriptionForm.tsx` (tab-cycled fields, 300ms debounced live preview, inline validation reusing `addSubscription`/`updateSubscription`'s own duplicate-name check). `App.tsx` `View` gains `sub-matches`/`sub-form` (`sub-form.returnTo: View`, suppresses global `q`/`?` like Ask AI); `Comments`' `returnTo` widened to a new `StoryOriginView` union so comments opened from matches return there on `esc`. `S` in search results opens the add form prefilled with the query (focus on name). `hn subs` opens the TUI on Subs |

V3 is feature-complete against `specs/v3/`. Verified per-phase live via tmux (bookmarks: star display, flash timing, Saved tab CRUD; watcher: all three exit codes against real Algolia, `--dry-run`, `--once` enforcement; subs TUI: manager, add-with-preview cross-checked against a direct Algolia query, matches browsing, bookmark toggle, delete confirm, and the full search → `S` → save → back-to-search-results loop) plus `npm test` (261 tests) and `npm run build` after every phase.

## V3.1 — Theme persistence (specs/v3.1/)

New `ui.theme` config key, additive to V2.5's `hn config` CLI.

| Phase | Status | Notes |
|-------|--------|-------|
| 1: `ui.theme` config key | done | `Config.ui?.theme` added (`lib/config.ts`, passed through as-is like `telegram`); `CONFIG_KEYS` gains `ui.theme` with a `validate` hook on `ConfigKeyDef` (`lib/configKeys.ts`) checked against `paletteNames()`, `unknown theme 'x' (valid: ...)` on a bad `set`; `configStore.ts`'s `resolveValue` generalized off its `'telegram' \| 'desktopNotifications'` union to include `'ui'`. `theme.ts`'s `resolvePaletteName` gains the config lookup between env and default (flag > `HN_THEME` env > `ui.theme` config > `hn` default), new `resolvePaletteSource()` reports which level won for `hn theme`'s status line (`(from flag/env/config)` / `(default)`); an invalid persisted value resolves to `hn` same as an invalid env var today. `hn theme` output and `hn config set/get ui.theme` verified live |

V3.1 is feature-complete against `specs/v3.1/`.

## V3.2 — Live in-TUI theme picker (specs/v3.2/)

Change theme from inside a running session, no restart.

| Phase | Status | Notes |
|-------|--------|-------|
| 1: reactive theme | done | Theme was a module-scoped singleton (`theme.ts`'s `export const theme = resolveTheme()`) read by 13 components at import time — turned reactive via a new `ThemeContext`/`useTheme()` pair; all 13 importers switched from the static import to the hook. `Comments.tsx`'s `buildHeaderSpans`/`tokenToSpan`/`buildRow` and `TabBar.tsx`'s `segmentColor` (module-level pure functions, can't call hooks) take `theme` as an explicit parameter instead. No behavior change on its own — `ThemeContext`'s default value is the same singleton every non-App render already saw |
| 2: picker overlay | done | `T` (new `GLOBAL_KEYS` entry) opens `ThemePicker.tsx` — `SubscriptionsView`-style list over `paletteNames()`, cursor opens on the active theme, `j`/`k`/arrows move, `esc` cancels. `App.tsx` owns `paletteName`/`themePickerOpen` state, resolves `activeTheme` each render, provides it via `ThemeContext.Provider`; picker takes the same overlay slot as `HelpOverlay`. New `THEME_PICKER_KEYS` footer hint. Adding a global key lengthens every footer hint enough to wrap an extra line at 80 columns — bumped `Comments.test.tsx`'s fixed test terminal height by one row to keep existing assertions valid |
| 3: persistence | done | `enter` in the picker calls `setConfigValue('ui.theme', name)` (reused as-is from V3.1) alongside the live `setPaletteName`, so the choice survives a restart; `esc` writes nothing. Verified live via tmux: `T` → navigate → `enter` recolors the whole UI immediately (confirmed via ANSI accent codes matching the target palette) |

V3.2 is feature-complete against `specs/v3.2/`.

## V3.3 — `concord` theme (specs/v3.3/)

7th palette, hand-ported from [chojs23/concord](https://github.com/chojs23/concord)'s ratatui color constants (not an Ink library — colors pulled from its Rust source and translated to hn-bits' `ansi256` format).

| Phase | Status | Notes |
|-------|--------|-------|
| 1: `concord` palette | done | New entry in `theme.ts`'s `palettes` object: `accent` `ansi256(44)` (cyan, from `Color::Cyan`), `title` `ansi256(255)`, `muted` `ansi256(243)` (from `Color::DarkGray`), `error` `ansi256(196)` (from `Color::Red`), `comment` `ansi256(80)`; `score`/`selectionBackground`/`link`/`email` reuse the shared invariants every other palette already uses. No plumbing changes — `paletteNames()`, `resolvePaletteName()`, and `configKeys.ts`'s `validateTheme` all derive from the object's keys. Also fixed a latent test-isolation gap in `theme.test.ts`: the "nothing set" default tests read the real `~/.config/hn-bits/config.json` whenever `HN_BITS_CONFIG` was left unset, which broke once a real `ui.theme` value existed on disk from live-testing V3.2 |

V3.3 is feature-complete against `specs/v3.3/`.

## Known gaps / follow-ups

- V1.6 phases 1–8 complete; V1.6 is feature-complete against `specs/v1.6/`.
- V2 phases 1–4 complete; V2 is feature-complete against `specs/v2/`.
- V2.5 phase 1 complete; V2.5 is feature-complete against `specs/v2.5/`.
- V3 phases 1–6 complete; V3 is feature-complete against `specs/v3/`.
- V3.1 phase 1 complete; V3.1 is feature-complete against `specs/v3.1/`.
- V3.2 phases 1–3 complete; V3.2 is feature-complete against `specs/v3.2/`.
- V3.3 phase 1 complete; V3.3 is feature-complete against `specs/v3.3/`.
- Next: the small slices V3.5 (desktop notify), V3.6 (Discord). Independent, can ship in any order.
