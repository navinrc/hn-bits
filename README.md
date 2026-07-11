# hn-bits

Terminal Hacker News client. Fullscreen TUI, stateless.

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

Press `?` in-app for all keybindings.

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

Specs in [`specs/`](specs/README.md), progress in [`PROGRESS.md`](PROGRESS.md). V1–V1.6 done; V2 (local AI) and V3 (subscriptions/watcher) spec'd.
