# Comments view (`src/ui/Comments.tsx`)

Reading model (locked in grilling): **flat top-level first, drill-in for replies.** No full collapsible tree in V1.

## Two levels

**Level 1 — top-level comments** of the story, one after another:

```text
 Postgres 18 released · 512 comments

 ▸ author1 · 2h · 4 replies
   Decoded comment text, wrapped to terminal width, possibly
   several paragraphs…

   author2 · 1h · 0 replies
   Another top-level comment…

 j/k move · enter replies · esc back · q quit
```

**Level 2 — reply subtree** of the selected comment: the parent pinned at top, its descendants below, indented 2 spaces per depth level. Same j/k selection; **no further drill-in** (subtree already fully visible); `esc` returns to level 1 preserving position.

## Behavior

- **Data:** one `fetchComments(storyId)` call on mount (Algolia — entire tree in a single request, see [03-api-algolia.md](03-api-algolia.md)). Both levels served from that one response; entering replies costs zero requests.
- **Selection & scrolling:** j/k move between comments; view scrolls to keep selection visible. Comments vary in height — scroll by comment, not by line.
- **Reply count** on each top-level row = total descendants (recursive), so "4 replies" means the whole subtree.
- Deleted/dead comments already filtered by API layer.
- **Loading/error:** same pattern as StoryList (`loading…` line; error message + `r` retry).

## HTML handling (`src/lib/html.ts`)

Comment `text` arrives as HTML. Rendering rules — no HTML parser dependency, regex/string transforms suffice for HN's tiny markup subset:

| Input | Output |
|-------|--------|
| `<p>` | paragraph break (blank line) |
| `<i>…</i>` | italics (Ink `<Text italic>`) — or plain text if simpler; italics optional in V1 |
| `<a href="X">…</a>` | show the URL `X` |
| `<pre><code>…</code></pre>` | indented block, preserve line breaks |
| `&gt; quoted` (HN quote convention) | render line dim/prefixed `│ ` |
| entities `&amp; &gt; &lt; &quot; &#x27; &#x2F;` etc. | decoded |
| any other tag | stripped |

Export: `htmlToText(html: string): string` (or a small segment structure if italic/quote styling is kept). Keep it dumb and total — unknown input must never crash the renderer.
