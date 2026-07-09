# V1.6 Phase 5 — Story list polish

Amends specs/v1.6/01-story-row-layout.md after comparing the first
implementation against demo-browse.gif.

## Rank alignment

```text
❯  1. IPv8 Proposal (ietf.org)
      40 points by EvanZhouDev 28m ago | 15 comments

   9. I made a terminal pager (theleo.zone)
      105 points by speckx 7h ago | 20 comments

  10. Introduction to spherical harmonics (gpfault.net)
      60 points by luu 3d ago | 6 comments
```

- Rank is right-aligned in a column sized by the widest rank currently
  fetched (`String(stories.length).length`), so `1.` and `10.` produce the
  same title start column.
- Prefix = marker + space + padded rank + `. `; meta line indents to the
  title start column (as today, but now stable across rank widths).
- Selection marker: `>` → `❯` (`theme.glyphs.selection`).

## Row spacing

- One blank separator line after each row: row height 2 → 3
  (`STORY_ROW_HEIGHT`), matching the design's airier list.
- Edge clipping order (partial row at viewport edge): separator drops
  first, then meta, then title — title is always the last line standing.

## Selection — both lines

Supersedes 01's "Row 2 is never highlighted": the selection background now
covers **both** the title line and the meta line, each padded to full
terminal width. The blank separator line is never highlighted. Text colors
on the selected row are unchanged (score stays accent, meta stays muted).
