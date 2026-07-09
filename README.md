# hn-bits

Terminal-first Hacker News client. Fullscreen TUI built with TypeScript + Ink (React for the terminal), backed by the HN Firebase and Algolia APIs. No config, no database — fully stateless.

## Install

```bash
npm install
npm run build
npm link   # exposes the `hn` binary
```

## Usage

```bash
hn                  # fullscreen shell: tab bar (top/new/best/ask/show), continuous scroll
hn search <query...>  # jump straight into search results
hn theme            # show the active color theme and available palettes
hn --theme dracula  # or: HN_THEME=dracula hn
```

Press `?` from any view for the full keybinding help overlay.

### Themes

`hn`, `mocha`, `dracula`, `tokyo`, `nord`, `gruvbox` (default: `hn`, HN-orange). Pick with `--theme <name>` or the `HN_THEME` env var — not persisted (no config file yet).

### Keybindings

**Global**

| Key | Action |
|-----|--------|
| `q` | quit (suppressed while typing in search) |
| `?` | help overlay (suppressed while typing in search) |

**Story list**

| Key | Action |
|-----|--------|
| `j`/`k` or ↓/↑ | move selection |
| `←`/`→` | previous/next feed tab |
| `t`/`n`/`b` | top / new / best directly |
| `g g` / `G` | top / bottom |
| `enter` | open comments |
| `o` | open story URL in browser |
| `r` | refresh feed |
| `/` | search |

**Comments**

| Key | Action |
|-----|--------|
| `j`/`k` or ↓/↑ | move selection |
| `space`/`enter` | toggle fold on a comment |
| `C`/`E` | collapse / expand all |
| `g g` / `G` | top / bottom |
| `o` | open story URL in browser |
| `r` | reload |
| `esc`/`b` | back |

**Search results**

Same as story list, minus the tab/feed keys, plus `/` to start a new search. `esc` returns to the list if you got here via `/` in-TUI, or quits if you entered via `hn search`.

## Development

```bash
npm run dev    # run the CLI from source (tsx)
npm test       # vitest
npm run build  # tsc
```

## Tech Stack

- **Language**: TypeScript (strict), ESM, ES2022 target
- **UI**: Ink `^7.1.0` (React renderer for terminals) + React `^19.2.7`
- **CLI**: Commander `^15.0.0`
- **Runtime**: `open` `^11.0.0`, native `fetch` — no HTTP client dep
- **Data sources**: HN Firebase API + HN Algolia Search API — no backend/database
- **Build**: `tsc` — no bundler
- **Dev runner**: `tsx` `^4.23.0`
- **Tests**: Vitest `^4.1.10` + vendored Ink test harness (`src/test/inkHarness.ts`)
- **Package manager**: npm

## Specs and progress

Implementation specs live in [`specs/`](specs/README.md); phase-by-phase status is tracked in [`PROGRESS.md`](PROGRESS.md). V1, V1.5, and V1.6 (this client) are feature-complete; V2 (local AI summaries) and V3 (subscriptions/watcher) are spec'd but not started.
