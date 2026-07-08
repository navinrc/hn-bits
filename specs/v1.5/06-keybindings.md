# V1.5 — Keybindings (supersedes v1/08-keybindings.md)

## Keymap module — `src/ui/keymap.ts`

Single data source per view: `{ key, label }[]`. Drives **both** the footer hints and the `?` help overlay so they can never drift. Handlers still live in each view's `useInput`; a completeness test asserts every handled key appears in the keymap.

## Global

| Key | Action | Note |
|-----|--------|------|
| `q` | quit | suppressed during search input |
| `?` | help overlay | suppressed during search input |

## Story list

| Key | Action |
|-----|--------|
| `j`/`k`, `↓`/`↑` | move selection |
| `←`/`→` | previous/next feed tab |
| `t`/`n`/`b` | top / new / best directly |
| `g g` / `G` | top / bottom |
| `enter` | open comments |
| `o` | open in browser |
| `/` | search |
| `r` | refresh feed |

## Comments

| Key | Action |
|-----|--------|
| `j`/`k`, `↓`/`↑` | move selection |
| `space` / `enter` | toggle fold |
| `C` / `E` | collapse / expand all |
| `g g` / `G` | top / bottom |
| `o` | open story in browser |
| `r` | reload |
| `esc` / `b` | back |

## Search results

Same as story list minus tabs/feed keys; `esc` = back (TUI entry) or quit (CLI entry).

## Help overlay — `src/ui/HelpOverlay.tsx`

- `?` toggles from any view except search input; handled in `App.tsx`.
- Fills the Body with the keymap table for the current view + globals. Any key dismisses.

## V1 → V1.5 changes (the sanctioned break)

| V1 binding | V1.5 |
|------------|------|
| `enter` (list) → StoryDetail | → comments directly |
| `]`/`[` pages | removed (continuous scroll) |
| `enter` (comments) → drill into replies | → toggle fold |
| StoryDetail keys (`c`, `esc`/`b` from detail) | view deleted |
| `r` retry on error only | refresh anytime |

New: `←`/`→`, `space`, `C`/`E`, `g g`/`G`, `?`, Ask/Show tabs. From this baseline the add-only rule resumes. `a` stays reserved for V2 Ask AI, `s` for V2 summaries, `B` for V3 bookmarks.
