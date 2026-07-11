# hn-bits

Terminal-first Hacker News client. Fullscreen TUI built with TypeScript + Ink (React for the terminal), backed by the HN Firebase and Algolia APIs. No database. Optional local-AI features (summaries + Ask AI) read a config file; everything else is fully stateless.

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

### Local AI (summaries + Ask AI)

Article/thread summaries (`s`) and interactive Q&A (`a`) run against a local [Ollama](https://ollama.com) instance — no cloud calls, no API keys. Optional: the app works fully without it, `s`/`a` just show a setup hint until configured.

**Prerequisites**

```bash
brew install ollama   # or see ollama.com/download
ollama serve           # if not already running as a service
ollama pull llama3.2    # or any other chat-capable model
```

**Setup** — create `~/.config/hn-bits/config.json` (one-time; override the path with `$HN_BITS_CONFIG`):

```json
{ "ollama": { "host": "http://localhost:11434", "model": "llama3.2" } }
```

No `hn config` command — edit the file directly. Missing fields fall back to the defaults above; invalid JSON degrades to "AI disabled" with a warning rather than crashing the reader.

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
| `s` | AI summary (article, or thread if no article) |
| `a` | Ask AI (chat grounded in the story) |

**Comments**

| Key | Action |
|-----|--------|
| `j`/`k` or ↓/↑ | move selection |
| `space`/`enter` | toggle fold on a comment |
| `C`/`E` | collapse / expand all |
| `g g` / `G` | top / bottom |
| `o` | open story URL in browser |
| `r` | reload |
| `s` | AI thread summary |
| `a` | Ask AI (chat grounded in the story) |
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
- **Local AI**: [Ollama](https://ollama.com) (native `fetch` streaming, no SDK) + `@mozilla/readability` and `jsdom` for article extraction — optional, config-gated
- **Build**: `tsc` — no bundler
- **Dev runner**: `tsx` `^4.23.0`
- **Tests**: Vitest `^4.1.10` + vendored Ink test harness (`src/test/inkHarness.ts`)
- **Package manager**: npm

## Specs and progress

Implementation specs live in [`specs/`](specs/README.md); phase-by-phase status is tracked in [`PROGRESS.md`](PROGRESS.md). V1, V1.5, V1.6, and V2 (local AI) are feature-complete; V3 (subscriptions/watcher) is spec'd but not started.
