# V1.6 Phase 8 — Full-accent navbar rule, unbroken selection bar, C-mode leaf collapse

Amends specs/v1.6/03-tab-bar.md (rule color; its "glyphs not themed" note no
longer holds) and specs/v1.6/06-comments-polish.md (§1 rule color, §3 fold
model, §5 selection). Driven by screenshot review 2026-07-09.

## 1. Tab bar — full-accent bottom rule

Supersedes 06 §1's color split ("`─` outside the notch stays dimColor").

- The entire bottom rule — every `─` plus the `╯ ╰` notch corners — renders
  in `theme.colors.accent`.
- The gap under the active tab stays open (classic tab notch, unchanged).
- Top border row unchanged: blank except the accent `╭─╮` cap.
- Brand, active/inactive labels, `? help` hint unchanged.

Anchor: `TabBar.tsx` `buildBottomRuleSegments` — today `splitAccent` marks
only the notch accent over a muted base line; the base becomes accent too.

## 2. Comments selection — unbroken bar + stripe

Hardens 06 §5. Observed defect: the `▌` bar and background stripe drop out
on lines following a full-width line of the selected comment.

- The accent `▌` bar and `selectionBackground` stripe render on **every**
  line of the selected comment — header, wrapped body lines, blank
  paragraph separators — with no gaps, at any depth and terminal width.
- Constraint: a selected row's painted content (indent + bar + text +
  padding) must never sum to exactly the terminal width. Reserve 1 trailing
  column in the row width/padding math — same `safeWidth = width - 1`
  treatment `StoryRow` received for the identical VT100 delayed-wrap bug
  (see PROGRESS.md, V1.6 exact-width bugfix row).
- Regression test required; verify red by temporarily reverting the fix,
  then green (CLAUDE.md regression rule).

Anchor: `Comments.tsx` `buildRow` (`width`) / `CommentRowView` (`rowWidth`,
padding).

## 3. C-mode fold — reveal becomes a toggle for leaves

Amends 06 §3 in two ways.

### 3a. Codify shipped two-step reveal

06 said `space`/`enter` on a header-only node "reveals body and (if any)
direct children in one press". Shipped behavior — accepted as correct —
is two-step:

- First press reveals the **body only**; children keep their own fold
  state (after `C`, hidden).
- Second press unfolds direct children as today.

### 3b. New: leaf reveal is reversible

Today `revealHeaderOnly` is one-way and `enter` on a revealed leaf (no
children) is a dead key — the innermost reply can never be re-collapsed.

- `space`/`enter` on a body-revealed **leaf** that entered header-only via
  `C` returns it to header-only. Repeatable toggle: header ↔ body.
- Scope: only `C`-originated rows. Default-view leaves (never header-only)
  keep `enter` as a no-op.
- Parents unchanged: `enter` keeps toggling child fold; no wrap back to
  header-only.

State machine (extends 06 §3 table; "revealed" = came out of header-only):

| State | enter (leaf) | enter (parent) |
|-------|--------------|----------------|
| header-only | → revealed (body shown) | → revealed (body shown, children as-is) |
| revealed | → header-only | toggles child fold |
| never header-only, no children | no-op | — |

Implementation sketch: revealing moves the id from `headerOnly` into a
tracked `revealed: Set<id>` instead of dropping it; `enter` on a revealed
leaf moves it back. `C`, `E`, and `r` reset the set. `commentTree.ts`
`revealHeaderOnly`'s "(one-way)" doc comment must change.

Keybindings: no keys added or removed; only the C-mode leaf meaning of
`space`/`enter` is refined (sanctioned V1.6-scope amendment, same clause
06 used for `E`).

## Unaffected

- Top border row, brand, tab labels, `? help`.
- Default fold state on load; `C`/`E`/`r` semantics beyond resetting the
  revealed set.
- Story header card, story list, search, loading indicator.
- All navigation keys.
