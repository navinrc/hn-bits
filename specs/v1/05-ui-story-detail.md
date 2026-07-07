# StoryDetail view (`src/ui/StoryDetail.tsx`)

Opened from StoryList (or search results) with **enter**. Pure presentation — receives the already-fetched `Story` via props, no additional fetch.

## Layout

```text
 ┌────────────────────────────────────────────────┐
 │ Postgres 18 released                           │
 │ example.com                                    │
 │                                                │
 │ 980 points · by author · 5h ago · 512 comments │
 └────────────────────────────────────────────────┘

 enter/c comments · o open in browser · esc back · q quit
```

- Title prominent (bold).
- Domain line (hostname extracted from `url`); omitted for text posts.
- Metadata line: score, author, relative age, comment count.

## Actions

| Key | Action |
|-----|--------|
| `enter` or `c` | Open Comments view for this story |
| `o` | Open in default browser via `open` package: story `url`, or `hnItemUrl(id)` for text posts |
| `esc` / `b` | Back to list (list state — page, selection — preserved by App) |
| `q` | Quit |

## Notes

- `o` must not disturb the TUI: fire `open(...)` and stay on the view.
- Ask HN / text post body (`item.text`) display is **not** in V1 — comments view covers discussion; body text lands with V2 article extraction if wanted.
