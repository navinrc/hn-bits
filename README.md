# hn-bits

Terminal-first Hacker News client. TypeScript + Ink (React for the terminal), backed by the HN Firebase and Algolia APIs. No config, no database — fully stateless.

## Install

```bash
npm install
npm run build
npm link   # exposes the `hn` binary
```

## Usage

```bash
hn                  # browse top/new/best stories
hn search <query...>  # jump straight into search results
```

### Keybindings

**Story list**

| Key | Action |
|-----|--------|
| `j`/`k` or ↓/↑ | move selection |
| `enter` | open story detail |
| `o` | open story URL in browser |
| `t`/`n`/`b` | switch feed (top/new/best) |
| `]`/`[` | next/previous page |
| `/` | search |
| `q` | quit |

**Story detail**

| Key | Action |
|-----|--------|
| `enter`/`c` | open comments |
| `o` | open story URL in browser |
| `esc`/`b` | back |
| `q` | quit |

**Comments**

| Key | Action |
|-----|--------|
| `j`/`k` | move selection |
| `enter` | drill into a comment's replies |
| `esc`/`b` | back (out of replies, or to story detail) |
| `q` | quit |

**Search results**

Same as story list, minus the feed-switch keys, plus `/` to start a new search. `esc` returns to the list if you got here via `/`, or quits if you entered via `hn search`.

## Development

```bash
npm run dev    # run the CLI from source (tsx)
npm test       # vitest
npm run build  # tsc
```

## Specs and progress

Implementation specs live in [`specs/`](specs/README.md); phase-by-phase status is tracked in [`PROGRESS.md`](PROGRESS.md). V1 (this client) is feature-complete; V2 (local AI summaries) and V3 (subscriptions/watcher) are spec'd but not started.
