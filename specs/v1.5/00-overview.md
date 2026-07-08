# hn-bits V1.5 — UI Overhaul (Overview)

Interface overhaul inspired by [heartleo/hn-cli](https://github.com/heartleo/hn-cli): fixed full-screen TUI, tab bar, continuous scrolling with progressive fetch, inline fold/unfold comment tree. Ships before V2 (Ollama AI).

## Goals

1. Full fixed-screen TUI: alternate screen buffer, pinned header (tab bar) + footer (key hints), body scrolls in a window. No reliance on terminal scrollback.
2. Story list: continuous scrolling through the full feed (~500 ids) with progressive batch fetch. Pagination (`]`/`[`, `PAGE_SIZE`) removed.
3. Tab bar with 5 feeds: Top / New / Best / **Ask / Show** (Ask/Show new). `←/→` switches tabs; `t/n/b` shortcuts kept.
4. Comments: single inline nested tree with per-node fold/unfold. Drill-in model deleted.
5. Story detail view deleted: Enter in list opens comments directly; story metadata moves to the comments header.
6. Theme-ready: all colors/glyphs centralized in one theme module. One theme only; switching lands with V2's config file.
7. `?` help overlay from any view.
8. Testing: pure-lib unit tests for all new logic **plus** Ink component smoke tests via a vendored test harness.

## Non-goals

- No config file, no theme selection, no persistence (still V2/V3 territory).
- No translation features (hn-cli has them; out of scope).
- No lazy comment loading — Algolia returns the full tree in one request; only *rendering* is windowed.
- No AI features (V2).

## Sanctioned keybinding break

`specs/README.md` previously ruled "later versions adjust V1 keybindings only by adding keys". V1.5 is a **sanctioned one-time break** (Enter semantics change, pagination keys removed, detail view keys removed). The add-only rule resumes from the V1.5 baseline.

## Verified platform facts (Ink 7.1.0)

- `render(node, { alternateScreen: true })` is native; restores primary screen on exit.
- `useWindowSize()` hook returns `{ columns, rows }` and re-renders on terminal resize.
- A frame taller than the terminal makes Ink clear-and-redraw every frame (flicker). Therefore: root Box is exactly `height={rows}`, body uses `overflowY="hidden"`, comment text is pre-wrapped so row heights are exact.
- `ink-testing-library@4` is **incompatible** with Ink 7 (its stdout stub lacks `isTTY`, so dynamic frames are never written). A ~70-line harness is vendored instead (07-testing.md).

## Pre-existing bug fixed in Phase 1

`src/ui/App.tsx` global `useInput` quits on `q` unconditionally — typing "q" in the search input exits the app. Fix: gate global keys on the active view; add a regression test.

## Phases

| Phase | Slice | Spec |
|-------|-------|------|
| 1 | Fullscreen shell tracer bullet: alt screen, Screen/Header/Body/Footer, theme.ts, test harness, `q` bug fix | 01, 02 (partial), 07 |
| 2 | Tab bar, Ask/Show feeds, continuous-scroll story list, StoryDetail deletion | 02, 03 |
| 3 | Inline comment tree with fold state, metadata header | 02 (line-based), 04 |
| 4 | Search in shell, keymap module, `?` help overlay | 05, 06 |
| 5 | Reconcile specs/PROGRESS/README, polish, PR | — |

Each phase is independently shippable: conventional commit + PROGRESS.md entry.

## Spec index

| File | Covers |
|------|--------|
| [01-shell.md](01-shell.md) | Alternate screen, layout components, theme module |
| [02-viewport.md](02-viewport.md) | Pure scroll-window math (fixed- and variable-height) |
| [03-story-list.md](03-story-list.md) | Tab bar, feeds, continuous scroll, progressive fetch |
| [04-comments.md](04-comments.md) | Fold/unfold tree, flatten ops, metadata header |
| [05-search.md](05-search.md) | Search results in shell, progressive Algolia paging |
| [06-keybindings.md](06-keybindings.md) | Full V1.5 keymap + help overlay (supersedes v1/08) |
| [07-testing.md](07-testing.md) | Vendored Ink test harness, test matrix |
