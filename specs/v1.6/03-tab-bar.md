# V1.6 Phase 4 — Tab bar redesign

Supersedes specs/v1.5/02-tabs.md's single-line `Top │ New │ …` header.
Reference: demo-browse.gif (heartleo/hn-cli).

## Layout

```text
                ╭─────╮
  Hacker News   │ Top │   New    Best    Ask    Show                  ? help
────────────────╯     ╰──────────────────────────────────────────────────────
```

- Header is now 3 rows (`HEADER_ROWS`: 1 → 3):
  1. Top border of the active tab's box only; blank elsewhere.
  2. `Hacker News` brand (bold, accent) + tabs + right-aligned `? help`
     (muted). Active tab bold accent inside `│ … │` side walls; inactive
     tabs muted.
  3. Full-width horizontal rule that joins the active tab's side walls
     (`╯`/`╰`), leaving the gap under the active tab open — classic tab
     notch.
- Tab gap: 3 spaces minimum between labels (design shows generous,
  consistent gaps).
- `? help` stays in the footer keymap too; the header hint is a static
  string, not a new keybinding (add-only rule untouched).

## Implementation notes

- `TabBar` builds the 3 lines as plain strings (rule/corner glyphs), no
  nested bordered `Box` — keeps line accounting exact for the layout math.
- `Layout.HEADER_ROWS` constant updates; every view already subtracts it.
- Rule/corner glyphs (`─ ╭ ╮ ╰ ╯ │`) hardcoded in `TabBar`, not themed —
  same treatment as the existing `│` separator.
