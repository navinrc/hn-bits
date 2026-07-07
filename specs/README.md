# hn-bits specs

Terminal-first Hacker News client (`hn` binary). Specs versioned by release; each version folder is self-contained enough to implement cold.

## Status

| Version | Theme | Status | Specs |
|---------|-------|--------|-------|
| V1 | Browse + search + comments | **done** | [v1/](v1/00-overview.md) |
| V2 | Local AI: summaries + Ask AI (Ollama) | spec'd | [v2/](v2/00-overview.md) |
| V3 | Subscriptions + watcher + Telegram + SQLite + bookmarks | spec'd | [v3/](v3/00-overview.md) |

## Roadmap

```mermaid
flowchart LR
    subgraph V1 [V1 — reader]
        A[top/new/best feeds] --> B[story detail] --> C[comments]
        S[search] --> B
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
        I --> M[bookmarks]
    end
    V1 --> V2 --> V3
```

## Ground rules (all versions)

- Personal tool, single user. Node.js ESM + TypeScript + Ink (React terminal UI). Native `fetch`.
- Dependencies added only when a version needs them (V2: `@mozilla/readability`, `jsdom`; V3: `better-sqlite3`).
- Config file and database appear only when first needed (config in V2, SQLite in V3). V1 is fully stateless.
- Later-version specs may adjust V1 keybindings only by **adding** keys; existing bindings stay stable.
