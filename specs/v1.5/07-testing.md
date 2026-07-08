# V1.5 — Testing

Two layers per CLAUDE.md rule 9: pure-lib unit tests for all new logic, plus Ink component smoke tests. Closes the "no component tests" gap flagged in PROGRESS.md.

## Why a vendored harness

`ink-testing-library@4` (last published against Ink 5) is **incompatible with Ink 7**: its stdout stub lacks `isTTY`, so Ink resolves non-interactive mode and never writes dynamic frames — `lastFrame()` stays empty. Vendor a ~70-line harness instead.

## Harness — `src/test/inkHarness.ts` (test-only)

- Fake stdin: `EventEmitter` with `isTTY = true`, no-op `setRawMode`/`ref`/`unref`; `write(s)` emits `data`.
- Fake stdout: `isTTY = true`, settable `rows`/`columns`, captures writes, `emitResize()` fires the `resize` event.
- Wraps Ink `render` with these streams (no `alternateScreen` in tests).
- API: `render(node) → { stdin, stdout, lastFrame(), rerender, unmount, waitUntilRenderFlush() }`. `lastFrame()` strips ANSI escapes from the final write chunk (interactive mode emits erase/sync sequences).
- Ink throttles renders (`maxFps` 30): tests `await waitUntilRenderFlush()` after simulated keystrokes.

## Test matrix

| Phase | Pure lib (vitest) | Component smoke (harness) |
|-------|-------------------|---------------------------|
| 1 | — | harness self-test; Screen renders header top / footer bottom at fake `rows`; resize re-renders; regression: `q` during search input does not quit |
| 2 | `viewport.test.ts`: `ensureVisible` / `visibleSlice` / `shouldFetchMore` edges (empty, height ≥ count, first/last row, shrink); `listNavigation` update (`nextFeed`/`previousFeed` wrap) | tab switch on `←`; scrolling past viewport keeps selection visible; progressive fetch fires with mocked `api/firebase` |
| 3 | `commentTree.test.ts`: fold skips subtree, `(+N)` counts, collapse/expand all, selection re-clamp; `wrapPlainText` / `ensureVisibleLines` / `sliceByLines` edges | `space` folds (children disappear, `(+N)` shown); `C` collapses all; header shows story metadata |
| 4 | keymap completeness (every handled key present) | `?` shows overlay, any key dismisses; search appends page on scroll with mocked Algolia |

## Conventions

- API modules mocked with `vi.mock`; no network in tests.
- Regression tests verified by temp-reverting the fix (CLAUDE.md regression rule).
- Existing `src/lib/*` tests keep passing; `pageSlice`/`totalPages` tests deleted with the functions.
