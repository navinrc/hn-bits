# Live in-TUI theme picker

V3.1 persists a theme choice to `ui.theme` config, but changing it still needs a `--theme` flag, `HN_THEME` env var, or `hn config set ui.theme <name>` — none take effect without a restart. This slice adds a picker inside the running TUI: open it, browse palettes, apply immediately.

Prerequisites: V3.1 (`ui.theme` config key, `src/lib/configStore.ts`'s `setConfigValue`), V1.5 (palettes, `src/ui/theme.ts`).

## Keybinding

`T` (global, added to `GLOBAL_KEYS` in `src/ui/keymap.ts`), available from every view. Footer while the picker is open shows its own hint set (`THEME_PICKER_KEYS`): `j/k move · enter apply · esc cancel`.

## Behavior

- `T` opens the picker over the current view, cursor starting on the currently active theme.
- `j`/`k`/arrows move the cursor through `paletteNames()`.
- `enter` applies the highlighted theme to the running app immediately (no restart) and persists it via `setConfigValue('ui.theme', name)`.
- `esc` closes the picker with no change — no live recolor, no config write.

## Reactivity

Theme was a module-scoped singleton (`src/ui/theme.ts`'s `export const theme = resolveTheme()`) read directly by 13 components at import time, so it could never change after the app started. Made live via a `ThemeContext`/`useTheme()` pair added to `theme.ts`; the 13 components switch from the static import to `useTheme()`. `App.tsx` owns the current palette name as state, resolves it to a `Theme` each render, and provides it through `ThemeContext.Provider` — so changing the state recolors the whole tree on the next render.

## Persistence

No new config schema — reuses V3.1's `ui.theme` key and `setConfigValue`/`validateTheme` as-is. Picking a theme is equivalent to running `hn config set ui.theme <name>`, just from inside the TUI.

## Out of scope

- Live preview while navigating the list before confirming — cursor movement alone doesn't recolor the app; only `enter` does. Deferred to keep this slice small.
- Adding/removing/renaming palettes.
