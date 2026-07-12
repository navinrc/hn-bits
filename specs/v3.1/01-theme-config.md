# Theme persistence (`ui.theme` config key)

Themes exist since V1.5 (`src/ui/theme.ts`: `hn` default, `mocha`, `dracula`, `tokyo`, `nord`, `gruvbox`) but the choice lives only in the `--theme` flag or the `HN_THEME` env var; nothing persists it. Small slice: one whitelisted config key.

Prerequisites: V2.5 (`hn config` CLI). Independent of the rest of V3.

## Config key

New `CONFIG_KEYS` entry (`src/lib/configKeys.ts`), additive:

```bash
hn config set ui.theme dracula
hn config get ui.theme
hn config unset ui.theme
```

- Type: string, validated against `paletteNames()` at `set` time. Unknown name = exit 1 with the valid list: `unknown theme 'foo' (valid: hn, mocha, dracula, tokyo, nord, gruvbox)`.
- Not `sensitive`; shown unmasked.

## Precedence

```text
--theme flag  >  HN_THEME env  >  ui.theme config  >  default (hn)
```

- `resolvePaletteName()` (`src/ui/theme.ts`) gains the config lookup between env and default. A stale/invalid persisted value (palette later renamed) silently falls back to default at render time, same as an invalid `HN_THEME` today; `set`-time validation makes this rare.
- Implementation note: `src/index.tsx` already maps the flag onto `HN_THEME` before render; the config read slots in the same pre-render spot, so `theme.ts`'s module-load `resolveTheme()` keeps working unchanged in shape.

## `hn theme` output

Gains the source of the active choice:

```text
Active theme: dracula (from config)
Available: hn (default), mocha, dracula, tokyo, nord, gruvbox
Set with `hn --theme <name>`, the HN_THEME environment variable, or `hn config set ui.theme <name>`.
```

`(from flag)`, `(from env)`, `(from config)`, or `(default)`.
