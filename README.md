# hn-bits

A fullscreen terminal client for Hacker News, built with TypeScript + Ink. Optional local AI summaries via Ollama, topic subscriptions with Telegram alerts, no cloud required beyond what you opt into.

![npm version](https://img.shields.io/npm/v/hn-bits)
[![CI](https://img.shields.io/github/actions/workflow/status/navinrc/hn-bits/release.yml)](https://github.com/navinrc/hn-bits/actions)
[![Release](https://img.shields.io/github/v/release/navinrc/hn-bits)](https://github.com/navinrc/hn-bits/releases)
[![npm downloads](https://img.shields.io/npm/dt/hn-bits)](https://www.npmjs.com/package/hn-bits)
![License](https://img.shields.io/badge/license-MIT-green)

![Streaming article summary, then a multi-turn Ask AI conversation grounded in the same story](docs/ai-demo.gif)

![Subs tab: manage topic subscriptions, browse per-topic matches](docs/subs-demo.gif)

![Saved tab: bookmark a story with B, browse it from hn bookmarks](docs/saved-demo.gif)

## Features

- Fullscreen TUI: top/new/best/ask/show/saved/subs tabs, vim-style navigation
- Threaded comments view with fold/collapse
- Search across stories
- 6 built-in themes (`hn`, `mocha`, `dracula`, `tokyo`, `nord`, `gruvbox`)
- Local AI article/thread summaries via Ollama, no cloud calls
- Ask AI: multi-turn Q&A grounded in the current story
- Subscriptions + `hn watch --once` radar with Telegram notifications
- Bookmarks: `B` to save a story, `hn bookmarks` to browse them
- SQLite storage (subscriptions, dedup, bookmarks); config file for AI/Telegram settings

## Install

```bash
npm install -g hn-bits
```

Or run without installing:

```bash
npx hn-bits
```

### From source

```bash
npm install
npm run build
npm link   # exposes the `hn` binary
```

## Usage

```bash
hn                    # fullscreen shell: top/new/best/ask/show/saved/subs tabs
hn search <query...>  # search results
hn bookmarks          # opens straight into the saved tab
hn subs               # opens straight into the subs tab
hn --theme dracula    # themes: hn (default), mocha, dracula, tokyo, nord, gruvbox
```

Press `?` from any view for the full keybinding help overlay.

### Local AI (summaries + Ask AI)

Article/thread summaries (`s`) and interactive Q&A (`a`) run against a local [Ollama](https://ollama.com) instance, no cloud calls, no API keys. Optional: the app works fully without it, `s`/`a` just show a setup hint until configured.

**Prerequisites**

```bash
brew install ollama   # or see ollama.com/download
ollama serve           # if not already running as a service
ollama pull llama3.2    # or any other chat-capable model
```

**Setup** (one-time):

```bash
hn config set ollama.host http://localhost:11434
hn config set ollama.model llama3.2
```

Missing fields fall back to the defaults above; invalid JSON degrades to "AI disabled" with a warning rather than crashing the reader.

### Subscriptions + Telegram notifications

`hn sub` tracks topic queries; `hn watch --once` checks each one, dedups against past matches, and sends new ones to Telegram. No daemon: schedule `hn watch --once` with cron or launchd.

```bash
hn sub add apple "Apple" --min-points 50   # topic name, Algolia query, min score
hn sub list
hn sub rm apple
```

**Telegram setup** (one-time):

1. Message [`@BotFather`](https://t.me/BotFather) on Telegram, run `/newbot`, copy the token it gives you.
2. Message your new bot once (anything, e.g. "hi").
3. Fetch `https://api.telegram.org/bot<TOKEN>/getUpdates` and read `result[0].message.chat.id`.

```bash
hn config set telegram.botToken 123456:ABC-...
hn config set telegram.chatId 987654321
hn config set telegram.enabled true
```

All three keys are required, `telegram.enabled` alone is not enough. With nothing enabled, `hn watch --once` exits with code 2.

```bash
hn watch --once   # one pass: query subscriptions, notify new matches, exit
```

Schedule it, e.g. every 30 minutes via crontab:

```
*/30 * * * * cd /path/to/hn-bits && hn watch --once
```

### Configuration

`hn config` reads/writes `~/.config/hn-bits/config.json` (override the path with `$HN_BITS_CONFIG`), no need to hand-edit JSON:

```bash
hn config list                        # every known key + current value
hn config get ollama.model            # single value, raw
hn config set ollama.model llama3.2   # validates + writes
hn config unset ollama.model          # removes a key
```

Sensitive values (e.g. `telegram.botToken`) print masked in `list` but raw from `get`, so scripts can still consume them. File format is plain JSON; hand-editing still works if you prefer it.

### Themes

`hn`, `mocha`, `dracula`, `tokyo`, `nord`, `gruvbox` (default: `hn`, HN-orange). Pick with `--theme <name>`, the `HN_THEME` env var, or persist it with `hn config set ui.theme <name>`. Precedence: flag > env > config > default. `hn theme` shows the active theme and where it came from.

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
| `B` | bookmark |

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
| `B` | bookmark |
| `esc`/`b` | back |

**Search results**

Same as story list, minus the tab/feed keys, plus `/` to start a new search and `S` to subscribe (prefills a topic from the query). `esc` returns to the list if you got here via `/` in-TUI, or quits if you entered via `hn search`.

**Saved** (`hn bookmarks`, or the Saved tab)

Same as story list, minus search; `B` removes a bookmark instead of adding one.

**Subs** (`hn subs`, or the Subs tab)

| Key | Action |
|-----|--------|
| `j`/`k` or ↓/↑ | move selection |
| `←`/`→` | previous/next tab |
| `enter` | browse matches for the selected topic |
| `a` | add subscription |
| `e` | edit subscription |
| `d` | delete subscription |

**Sub matches** (opened from Subs via `enter`)

Same as story list, minus search/tab-switch; `r` refetches, `esc` returns to Subs.

## Development

```bash
npm run dev    # run from source (tsx)
npm test       # vitest
npm run build  # tsc
```

## Tech stack

- TypeScript (strict, ESM) + Ink (React for terminals)
- Commander CLI, native `fetch`
- HN Firebase + Algolia APIs, no backend
- `better-sqlite3` for subscriptions/dedup/bookmarks
- Vitest

## Specs

Implementation specs live in [`specs/`](specs/README.md); phase-by-phase status is tracked in [`PROGRESS.md`](PROGRESS.md). V1, V1.5, V1.6, V2 (local AI), and V3 (subscriptions/watcher/notifications/bookmarks) are feature-complete.
