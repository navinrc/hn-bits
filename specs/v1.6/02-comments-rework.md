# V1.6 Phase 2 — Comments view rework

Supersedes specs/v1.5/04-comments.md's flat always-expanded tree and
plain-text header.

## Header — bordered card

```text
╭──────────────────────────────────────────────────────────╮
│ Google broke its promise to me — now ICE has my data      │
│ ▲ 1238 points by Brajeshwar 10h | 545 comments             │
│ https://www.eff.org/deeplinks/2026/04/...                  │
╰──────────────────────────────────────────────────────────╯
```

- `Box borderStyle="round" borderColor={theme.colors.accent}`, column layout,
  horizontal padding.
- Line 1: bold title, no domain-in-parens (URL shown in full below instead).
- Line 2: `▲ {score} points by {author} {age} | {comments} comments` (new
  `glyphs.upvote = '▲'`; drops the "ago"/"·" separators used previously).
- Line 3: full `story.url`, accent color, only when present.

## Comment tree — collapsed by default

- On load, initial fold state is `collapseAll(tree)` (every node with
  children starts with its children hidden) instead of `new Set()`.
- A folded node still shows its own body text — folding only hides
  descendants, not the node itself (`buildRow` stops short-circuiting to
  header-only when folded).
- Any node with `descendantCount > 0` always shows a right-aligned
  `N replies` / `1 reply` badge on its header line, in any fold state.
- `space`/`enter` toggles fold on the selected node, same as today —
  revealing direct children (each themselves collapsed if they have their
  own replies, so drill-in is recursive one level at a time).
- `C` / `E` (collapse all / expand all) unchanged.

## Selection — bordered card

- Selected comment renders inside
  `Box borderStyle="round" borderColor={theme.colors.accent}` wrapping its
  header + body lines, replacing the current per-line `inverse` highlight.
- Unselected rows unchanged: plain `<Text>` per line, `marginLeft={depth * 2}`.

## Unaffected

Keybindings table (specs/v1.5/06-keybindings.md) — no keys added or removed,
only default fold state and folded-node body visibility change. Consistent
with the V1.5 add-only baseline.
