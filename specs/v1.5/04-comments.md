# V1.5 — Comments: Inline Fold/Unfold Tree

Replaces V1's drill-in model (`specs/v1/06-ui-comments.md`) with a single inline nested tree, hn-cli style. Algolia already returns the **full tree in one request** (`fetchComments`), so there is no lazy loading — only fold-state rendering and windowing.

## Layout

```
Header:  Title of the story (example.com)
         123 points · by author · 4h ago · 87 comments
Body:    ▾ user1 2h ago
           First line of comment text wrapped to width...
           second wrapped line
           ▾ user2 1h ago
             nested reply...
           ▸ user3 1h ago (+12)
Footer:  j/k move · space fold · C/E all · o open · esc back · ? help
```

- Indent = `depth * 2` spaces.
- Fold markers from `theme`: `▾` expanded, `▸` folded; folded nodes show `(+N)` descendant count.
- Selected row highlighted (inverse) on its header line.

## Fold state — `src/lib/commentTree.ts` (pure)

```ts
interface FlatComment {
  node: CommentNode;
  depth: number;
  descendantCount: number;
  isFolded: boolean;
}

// Depth-first flatten; children of folded ids are skipped.
flattenTree(nodes: CommentNode[], folded: ReadonlySet<number>): FlatComment[]

toggleFold(folded: ReadonlySet<number>, id: number): Set<number>
collapseAll(nodes: CommentNode[]): Set<number>   // every id that has children
expandAll(): Set<number>                          // empty set
```

Reuses `countDescendants` from `src/lib/comments.ts`. `flattenSubtree` (drill-in helper) is deleted.

## Rendering

- `useMemo` the flatten on `[comments, folded]` — O(n) per change, never per frame.
- Row heights: 1 (author line) + `wrapPlainText(body, width).length` when expanded; 1 when folded. Windowed via `ensureVisibleLines` / `sliceByLines` (02-viewport.md). Only visible rows become Ink elements — mandatory for 1000+ comment threads.
- Comment HTML through existing `htmlToText` (`src/lib/html.ts`).

## Keys

| Key | Action |
|-----|--------|
| `j`/`k`, `↓`/`↑` | move selection through visible (unfolded) rows |
| `space` / `enter` | toggle fold on selected node |
| `C` / `E` | collapse all / expand all |
| `g g` / `G` | top / bottom |
| `o` | open story in browser |
| `r` | reload comments |
| `esc` / `b` | back to list (or search results) |
| `q` | quit |

Selection re-clamps after any fold operation (folding can shrink the flat list above the selection).
