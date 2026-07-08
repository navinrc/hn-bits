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
```

Press `?` from any view for the full keybinding help overlay.

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

## Specs and progress

Implementation specs live in [`specs/`](specs/README.md); phase-by-phase status is tracked in [`PROGRESS.md`](PROGRESS.md). V1 and V1.5 (this client) are feature-complete; V2 (local AI summaries) and V3 (subscriptions/watcher) are spec'd but not started.
