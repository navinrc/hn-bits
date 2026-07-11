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
hn                    # fullscreen shell: top/new/best/ask/show tabs
hn search <query...>  # search results
hn --theme dracula    # themes: hn (default), mocha, dracula, tokyo, nord, gruvbox
```

Press `?` from any view for the full keybinding help overlay.

### Local AI (summaries + Ask AI)

Article/thread summaries (`s`) and interactive Q&A (`a`) run against a local [Ollama](https://ollama.com) instance — no cloud calls, no API keys. Optional: the app works fully without it, `s`/`a` just show a setup hint until configured.

![Streaming article summary, then a multi-turn Ask AI conversation grounded in the same story](docs/ai-demo.gif)

**Prerequisites**

```bash
brew install ollama   # or see ollama.com/download
ollama serve           # if not already running as a service
ollama pull llama3.2    # or any other chat-capable model
```

**Setup** — one-time:

```bash
hn config set ollama.host http://localhost:11434
hn config set ollama.model llama3.2
```

Missing fields fall back to the defaults above; invalid JSON degrades to "AI disabled" with a warning rather than crashing the reader.

### Configuration

`hn config` reads/writes `~/.config/hn-bits/config.json` (override the path with `$HN_BITS_CONFIG`) — no need to hand-edit JSON:

```bash
hn config list                        # every known key + current value
hn config get ollama.model            # single value, raw
hn config set ollama.model llama3.2   # validates + writes
hn config unset ollama.model          # removes a key
```

Sensitive values (e.g. a future Telegram bot token) print masked in `list` but raw from `get`, so scripts can still consume them. File format is plain JSON — hand-editing still works if you prefer it.

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
npm run dev    # run from source (tsx)
npm test       # vitest
npm run build  # tsc
```

## Tech stack

- TypeScript (strict, ESM) + Ink (React for terminals)
- Commander CLI, native `fetch`
- HN Firebase + Algolia APIs — no backend, no database
- Vitest

## Specs

Implementation specs live in [`specs/`](specs/README.md); phase-by-phase status is tracked in [`PROGRESS.md`](PROGRESS.md). V1, V1.5, V1.6, and V2 (local AI) are feature-complete; V3 (subscriptions/watcher) is spec'd but not started.
