# V2 — Local AI (Ollama)

Adds local-AI reading aids on top of the V1.6 reader: **summaries** (article and comment thread) and **Ask AI** (interactive Q&A grounded in the story + thread). Everything runs against a local Ollama instance — no cloud calls, no API keys.

Prerequisite: V1.6 complete ([../v1.5/00-overview.md](../v1.5/00-overview.md), [../v1.6/01-story-row-layout.md](../v1.6/01-story-row-layout.md)). Baseline notes: StoryDetail was removed in V1.5 — the views are story list (tabs + search) and Comments; all keybindings live in `src/ui/keymap.ts`, which drives both the footer hints and the `?` help overlay.

## V2 scope

1. **Config file** — first persistent artifact: `~/.config/hn-bits/config.json` (Ollama endpoint + model). App works fully without it; AI features degrade to a setup hint.
2. **Ollama client** — `src/ai/ollama.ts`: streaming chat, health check, clear error taxonomy.
3. **Article extraction** — `src/lib/article.ts`: fetch story URL, Readability, plain text with fallbacks.
4. **Summaries** — `s` in the story list (article; text posts fall back to post text, then thread) and in Comments (thread), streamed into a panel.
5. **Ask AI** — `a` from the story list or Comments opens a chat view with story + article + thread as context, multi-turn within the session. From the list the thread is fetched on demand.

New keys extend `src/ui/keymap.ts` (`LIST_KEYS`, `COMMENTS_KEYS`, `SEARCH_RESULTS_KEYS`) so footer hints and the `?` overlay stay in sync.

## Out of V2

Bookmarks, subscriptions, watcher, notifications, SQLite (all V3). Cloud LLM providers. Persisting chat history or summaries (stateless beyond the config file). Summarizing individual comments. Model management (pulling models is the user's job via `ollama pull`).

## Pipeline overview

```mermaid
flowchart TD
    subgraph inputs
        U[story.url] --> X[article extraction<br/>lib/article.ts]
        T[comment tree<br/>api/algolia.ts] --> FL[flatten + trim<br/>token budget]
    end
    X --> PA[article summary prompt]
    FL --> PT[thread summary prompt]
    X & FL & M[story metadata] --> PC[Ask AI context]
    PA & PT & PC --> O[ai/ollama.ts<br/>POST /api/chat stream]
    O --> UI[Ink: token-streamed panel / chat view]
```

## New dependencies

| Package | Why |
|---------|-----|
| `@mozilla/readability` | article body extraction |
| `jsdom` | DOM for Readability |

## New modules

```text
src/
├── ai/
│   ├── ollama.ts      # chat streaming, health check, errors
│   └── context.ts     # thread trimming + Ask AI context assembly
├── lib/
│   ├── article.ts     # fetch + Readability → plain text
│   └── config.ts      # load/validate config file
└── ui/
    ├── SummaryPanel.tsx
    └── AskAI.tsx
```

Existing-code touch points: `src/api/firebase.ts` `Story` gains optional `text?: string` (text-post body, needed for the list `s` fallback); `src/ui/keymap.ts` gains the `s`/`a` bindings.

## Spec index

| File | Covers |
|------|--------|
| [01-config.md](01-config.md) | Config file location, schema, defaults, no-config behavior |
| [02-ollama-client.md](02-ollama-client.md) | Chat API, streaming, health check, error taxonomy |
| [03-article-extraction.md](03-article-extraction.md) | Fetch, Readability, fallback chain, truncation |
| [04-summaries.md](04-summaries.md) | `s` key, panel layout, prompts, thread trimming |
| [05-ask-ai.md](05-ask-ai.md) | `a` key, chat view, context assembly, streaming UX |
