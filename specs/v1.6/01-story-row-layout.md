# V1.6 Phase 1 — Story row layout

Supersedes the single-line row format from specs/v1/04-ui-story-list.md and
specs/v1.5/03-story-list.md ("StoryRow keeps its single-line format").

## Layout

```text
 ▸ 1. Google broke its promise to me — now ICE has my data (eff.org)
      1238 points by Brajeshwar 10h ago | 545 comments

   2. Backblaze has stopped backing up OneDrive and Dropbox folders (rareese.com)
      1105 points by rrreese 2d ago | 668 comments
```

- Row 1: marker (`>` selected / space) + rank + `. ` + bold title, truncated to
  width, + ` (hostname)` in muted color when `story.url` is present
  (`getHostname`, `src/lib/url.ts`).
- Row 2: indent = row-1 prefix width, then
  `{score} points by {author} {age} ago | {comments} comments`. Score in
  accent/score color, rest muted. Never highlighted.
- Selected row: row 1 only is padded to full terminal width and rendered with
  `theme.selectionBackground`. Row 2 is never highlighted.
- Row height is fixed at 2 lines; titles truncate rather than wrap.

## Theme (`src/ui/theme.ts`)

- `glyphs.selection`: `▸` → `>`.
- `glyphs.points` / `glyphs.comments`: removed (only consumer was `StoryRow`;
  dead after this phase).
- New `selectionBackground` color, shared across all palettes.

## Viewport

`StoryListView`/`StoryList` move from item-based windowing
(`visibleSlice`/`ensureVisible`) to the line-based windowing already used by
`Comments.tsx` (`ensureVisibleLines`/`sliceByLines` from
`src/lib/viewport.ts`), since each row is now 2 lines tall. Partial rows at
the viewport edge clip row 2 (meta line) first, keeping the title visible.
