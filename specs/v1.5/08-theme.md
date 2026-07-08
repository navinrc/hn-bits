# V1.5 — Theme palettes (phase 6)

Inspired by [heartleo/hn-cli](https://github.com/heartleo/hn-cli)'s `Theme` struct and named palette map. Adds color to the story list (currently plain text) and lets the palette be swapped without touching component code.

## Theme module — `src/ui/theme.ts`

`ThemeColors`: `accent` (tab highlight, score), `title` (story/comment titles), `muted` (secondary text: author, time, comment count), `error`, plus `score`/`comment` where a palette wants them distinct from `accent`/`muted`. Colors are `ansi256(N)` strings (Ink/Chalk-supported, see `colorize.js`) — reusing hn-cli's exact xterm-256 codes gives visual parity.

Named palettes, ported 1:1 from hn-cli's `colors.go` (subset of roles this app uses): `hn` (default, HN orange), `mocha`, `dracula`, `tokyo`, `nord`, `gruvbox`.

`resolveTheme(name?: string): Theme` — explicit arg wins, else `HN_THEME` env var, else `hn`. Unknown name falls back to `hn` rather than throwing (personal CLI tool, bad input shouldn't crash it). `theme` singleton is resolved once at module load from `HN_THEME`; `--theme` (below) sets the env var before `theme.ts` is first imported.

No persistence — config file is still deferred to V2 per `specs/README.md` ground rules. `HN_THEME=mocha hn` or `hn --theme mocha` are the only ways to pick a palette this phase.

## CLI — `src/index.tsx`

- `--theme <name>` global option. Actions become `async`; App is dynamic-`import()`ed *after* the option sets `process.env.HN_THEME`, so `theme.ts`'s module-load-time resolution sees it (static top-level imports would run before commander parses argv).
- `hn theme` subcommand: prints the active palette name and the list of available names. Informational only — no write, no config.

## Component changes

- `StoryRow.tsx` gets color for the first time: title → `theme.colors.title`, score → `theme.colors.score`, comment count → `theme.colors.comment`, age/author → `theme.colors.muted`. Also fixes a spec drift from `01-shell.md` (emoji glyphs were supposed to be replaced by `theme.glyphs.points`/`.comments` in V1.5 phase 1 but `StoryRow` still hardcoded `⯅`/`💬`).
- `Comments.tsx`, `StoryList.tsx`, `SearchResults.tsx`: hardcoded `color="red"` error lines → `theme.colors.error`.
- `Layout.tsx` Footer: `theme.colors.dim` → `theme.colors.muted` (same role, one name).

## Testing

- `theme.test.ts`: `resolveTheme()` — default, explicit name, `HN_THEME` env var, unknown name falls back to `hn`.
- Existing StoryList/SearchResults/Comments smoke tests keep passing (`lastFrame()` strips ANSI, text content unchanged).
