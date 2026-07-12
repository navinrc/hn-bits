# hn-bits specs

Terminal-first Hacker News client (`hn` binary). Specs versioned by release; each version folder is self-contained enough to implement cold.

## Status

| Version | Theme | Status | Specs |
|---------|-------|--------|-------|
| V1 | Browse + search + comments | **done** | [v1/](v1/00-overview.md) |
| V1.5 | UI overhaul: fullscreen TUI, tabs, comment tree, theme palettes | **done** | [v1.5/](v1.5/00-overview.md) |
| V1.6 | Visual rework: two-line story rows, bordered comments cards, collapsed-by-default threads, tab bar + polish + loader, comments polish (colors, fold states, contacts), navbar rule + selection/fold follow-ups | **done** | [v1.6/](v1.6/01-story-row-layout.md) |
| V2 | Local AI: summaries + Ask AI (Ollama) | **done** | [v2/](v2/00-overview.md) |
| V2.5 | Config CLI (`hn config get/set/unset/list`) | **done** | [v2.5/](v2.5/01-config-cli.md) |
| V3 | Subscriptions (CLI + subs tab TUI) + watcher + Telegram + SQLite + bookmarks | **done** | [v3/](v3/00-overview.md) |
| V3.1 | Theme persistence (`ui.theme` config key) | **done** | [v3.1/](v3.1/01-theme-config.md) |
| V3.5 | macOS desktop notifications (alerter) | spec'd | [v3.5/](v3.5/01-desktop-notifications.md) |
| V3.6 | Discord notifications (webhook) | spec'd | [v3.6/](v3.6/01-discord.md) |

## Roadmap

```mermaid
flowchart LR
    subgraph V1 [V1 — reader]
        A[top/new/best feeds] --> B[story detail] --> C[comments]
        S[search] --> B
    end
    subgraph V15 [V1.5 — UI overhaul]
        U[fullscreen shell] --> V[tab bar + ask/show]
        V --> W[continuous scroll]
        U --> X[fold/unfold comment tree]
    end
    subgraph V16 [V1.6 — visual rework]
        Y[two-line story rows] --> Z[bordered comments cards]
        Z --> AA[collapsed-by-default threads]
    end
    subgraph V2 [V2 — local AI]
        D[config file] --> E[Ollama client]
        E --> F[article + thread summaries]
        E --> G[Ask AI chat]
        H[article extraction] --> F & G
    end
    subgraph V3 [V3 — radar]
        I[SQLite storage] --> J[subscriptions]
        J --> K[hn watch --once]
        K --> L[Telegram notify]
        J --> N[subs tab TUI]
        I --> M[bookmarks]
    end
    V1 --> V15 --> V16 --> V2 --> V3
```

## Ground rules (all versions)

- Personal tool, single user. Node.js ESM + TypeScript + Ink (React terminal UI). Native `fetch`.
- Dependencies added only when a version needs them (V2: `@mozilla/readability`, `jsdom`; V3: `better-sqlite3`).
- Config file and database appear only when first needed (config in V2, SQLite in V3). V1 is fully stateless.
- Later-version specs may adjust keybindings only by **adding** keys; existing bindings stay stable. V1.5 is a sanctioned one-time break (Enter semantics, pagination removal, StoryDetail deletion — see [v1.5/06-keybindings.md](v1.5/06-keybindings.md)); the add-only rule resumes from the V1.5 baseline.
