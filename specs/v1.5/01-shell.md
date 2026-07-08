# V1.5 — Fullscreen Shell

## Alternate screen

`src/index.tsx` renders with `render(<App />, { alternateScreen: true })`. Ink handles enter/exit escape sequences and cursor hiding; primary screen restores on exit. Only active on a TTY — non-interactive runs (piped output) are unaffected.

## Layout components — `src/ui/Layout.tsx`

```
┌──────────────────────────────────────┐
│ Header (1-2 rows: tab bar / title)   │
│ Body (flexGrow=1, overflowY=hidden)  │
│ ...                                  │
│ Footer (1 row: dim key hints)        │
└──────────────────────────────────────┘
```

- `Screen`: `<Box flexDirection="column" width={columns} height={rows}>` using `useWindowSize()`. Exactly terminal-sized — never taller (avoids Ink's per-frame clear/flicker).
- `Header`: fixed-height top row(s). Content injected per view (tab bar in list, story metadata in comments, query in search).
- `Body`: `<Box flexGrow={1} overflowY="hidden" flexDirection="column">`. Views render only their visible slice into it (02-viewport.md).
- `Footer`: single dim line of key hints, driven by the keymap module (06-keybindings.md).

`App.tsx` wraps every view in `Screen`; each view supplies header/footer content via props (small "view chrome" contract) so chrome stays pinned while only Body content changes.

Tiny-terminal guard: if `rows < 8`, render a one-line "terminal too small" message instead of the layout.

## Theme module — `src/ui/theme.ts`

Single exported `theme` object; components import colors/glyphs from here only — no hardcoded colors anywhere else. One default theme in V1.5; selection arrives with V2's config file.

Contents (extracted from current hardcoded usage):

- colors: selection (inverse), dim/hint, error (red), accent (tab active, points), title
- glyphs: selection marker `▸`, fold markers `▾` / `▸`, points `▲`, comments `c:`

Emoji glyphs (`⯅`, `💬`) are replaced with ASCII — emoji cell width is unreliable across terminals and exact widths now matter for the fixed viewport.

## Resize behavior

`useWindowSize()` re-renders on resize. Scroll offsets are **derived at render time** from selection + height (02-viewport.md), never stored in effects — shrinking the terminal can therefore never strand the selection off-screen.

## Bug fix (regression-tested)

Global `q` handler in `App.tsx` currently quits unconditionally, so typing "q" in the search input exits the app. Fix: global keys (`q`, later `?`) are ignored while the `search-input` view is active. Regression test: temp-revert verifies the test catches the bug.
