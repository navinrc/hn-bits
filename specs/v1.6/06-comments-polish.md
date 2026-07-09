# V1.6 Phase 7 — Comments polish: colors, fold states, contacts, tab notch

Amends specs/v1.6/02-comments-rework.md (fold model, badge, selection style)
and specs/v1.6/03-tab-bar.md (notch color). Driven by expected-view mockups
reviewed 2026-07-09.

## 1. Tab bar — consistent notch color

The active-tab notch box currently renders mixed: `│` walls come from the
active segment (accent) while the `╭─╮` top border and `╯ ╰` bottom-rule
notch render `dimColor`.

- Every notch glyph — `╭`, `─` (box top), `╮`, `│` walls, `╯`, `╰` — renders
  in `theme.colors.accent`.
- The rest of the top border row (spaces) and bottom rule (`─` outside the
  notch) stay `dimColor` as today.
- Active label stays accent bold; brand and inactive tabs unchanged.

## 2. Comment header line — colors + inline badge

Current: one plain string, badge right-aligned at terminal edge.

New format, styled per segment:

```text
▾ pesus · 1d | 6 replies          (body visible, replies hidden)
▸ gregsadetsky · 1d | [4 more]    (header-only)
▾ jsabess24 · 1h                  (leaf — no badge)
```

- Fold glyph: accent. `▸` = header-only row, `▾` = body visible (glyph now
  tracks body visibility, not child-fold state).
- Author: accent, bold.
- `· {age}`: muted; drop the trailing `ago`.
- `| {badge}`: muted; only when the node has descendants. Badge text is
  `[N more]` when the row is header-only, else `N replies` / `1 reply`.
- Right-aligned badge and `rightAlignBadge` are removed; badge is inline.

## 3. Fold model — header-only state, C/E rework

Two per-node sets replace the single `folded` set semantics:

- `folded: Set<id>` — children hidden (exists today, unchanged meaning).
- `headerOnly: Set<id>` — own body hidden; row is just the header line.

States a node can be in:

| State | Body | Children | Glyph | Badge |
|-------|------|----------|-------|-------|
| header-only | hidden | hidden | `▸` | `[N more]` |
| collapsed | shown | hidden | `▾` | `N replies` |
| expanded | shown | shown | `▾` | `N replies` |

Key behavior:

- **Default (load / `r` reload)**: unchanged — every node collapsed
  (body shown, children hidden). `headerOnly` empty.
- **`C` (collapse all)**: every node (parents and leaves) becomes
  header-only. No comment text visible anywhere.
- **`E` (expand)**: reset to the default state — every body visible,
  every reply hidden. Full-tree expand is removed; no key produces it.
  `expandAll()` in commentTree.ts is replaced accordingly.
- **`space`/`enter` on header-only node**: reveals body and (if any)
  direct children in one press. Children appear in their own current
  state — after `C` that means header-only, so drill-in stays
  comment-free until each child is selected.
- **`space`/`enter` on collapsed/expanded node**: toggles child fold
  exactly as today; body stays visible (refold never re-hides a body).
- **`space`/`enter` on header-only leaf**: reveals its body (today this
  is a no-op only because leaves can't fold — header-only leaves must
  still open).

Keybindings: no keys added or removed; `C/E all` footer label may become
`C/E collapse/expand`. Only E's meaning changes (sanctioned, V1.6 scope).

## 4. Contact highlighting in comment bodies

Detect within the plain text produced by `htmlToText` (anchors already
surface as bare URLs):

- **URLs** (`https?://…`): cyan, underlined.
- **Emails** (`user@host.tld`): green, bold.

Theme: two new semantic colors shared across all palettes (same precedent
as `selectionBackground` — affordance, not theme accent):

```ts
link:  ansi256(81)   // cyan
email: ansi256(114)  // green
```

Implementation note: detection must survive wrapping — match on the
unwrapped text and carry style ranges through `wrapPlainText`, or wrap
first and tokenize per line accepting that a URL split across lines only
colors the matching head. Either is acceptable; prefer whichever keeps
`viewport.ts` untouched.

## 5. Selection — left bar + background stripe

Replaces the bordered-card selection from specs/v1.6/02.

- Selected comment renders with an accent `▌` bar in the leftmost column
  of each of its lines and `theme.colors.selectionBackground` across the
  full row width (matching story-list selection).
- The 2-column width reserve stays (bar + space instead of border walls),
  so wrapping does not shift when selection moves.
- Unselected rows unchanged.

## Unaffected

- Default fold state on load (bodies visible, replies hidden).
- Story header card, loading indicator, story list, search.
- All navigation keys (`j/k`, `gg/G`, `o`, `r`, `esc`, `q`, `?`).
