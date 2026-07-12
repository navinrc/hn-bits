# `concord` theme

7th palette, ported from [chojs23/concord](https://github.com/chojs23/concord) — a Rust/`ratatui` Discord TUI client, not an Ink library. Its colors were pulled directly from its source (`src/tui/ui/types.rs`, `src/tui/message/format.rs`, `src/tui/ui.rs`) and translated to hn-bits' `ansi256(code)` palette format; nothing was imported or linked at runtime.

Prerequisites: V1.5 (`src/ui/theme.ts` palette system).

## Source colors

- `ACCENT = Color::Cyan`
- `DIM = Color::DarkGray`
- error assertions use `Color::Red`
- selected message card: `bg(Rgb(24,54,65))` (dark teal) on white text

## Mapping

Same invariants every existing palette (`hn`, `mocha`, `dracula`, `tokyo`, `nord`, `gruvbox`) follows: `score` is the shared HN-orange `ansi256(208)` regardless of theme; `selectionBackground`, `link`, `email` reuse the shared module-level constants. Only `accent`, `title`, `muted`, `error`, `comment` are palette-specific.

| Role | Value | From |
|------|-------|------|
| `accent` | `ansi256(44)` | `Color::Cyan` |
| `title` | `ansi256(255)` | bright/default text |
| `muted` | `ansi256(243)` | `Color::DarkGray` |
| `error` | `ansi256(196)` | `Color::Red` |
| `comment` | `ansi256(80)` | echoes the dark-teal selection background without duplicating `accent` |

## Usage

`hn --theme concord`, `HN_THEME=concord`, `hn config set ui.theme concord`, or pick it live with `T` — no new plumbing, `paletteNames()`/`resolvePaletteName()`/`validateTheme` all derive from the `palettes` object's keys.
