# V1.6 Phase 6 — Loading indicator

Replaces the bare `loading…` text with the design's animated spinner.

## Layout

```text
  ⠹ Loading stories...
```

- Braille dots spinner (`⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏`), 80ms per frame,
  accent color; label in title color.
- One shared `LoadingIndicator` component (`src/ui/LoadingIndicator.tsx`),
  label per call site:
  - `StoryList` → `Loading stories...`
  - `Comments` → `Loading comments...`
  - `SearchResults` → `Searching...`
- The `loading more…` footer line on progressive fetch keeps its current
  plain text (design shows no spinner there).

## Implementation notes

- No new dependency (no `ink-spinner`); a `useState` + `useEffect`
  interval hook inside the component is enough.
- Interval must be cleaned up on unmount; tests can assert the label and
  that the frame glyph is one of the spinner frames (no timing assertions).
