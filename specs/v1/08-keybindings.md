# Keybindings

Global reference. Footer of each view shows the relevant subset.

## Everywhere

| Key | Action |
|-----|--------|
| `q` | quit (restore terminal) |
| `esc` | back one level (no-op at top-level list) |
| `j` / `↓` | move down |
| `k` / `↑` | move up |

## StoryList (feeds + search results)

| Key | Action |
|-----|--------|
| `enter` | open story detail |
| `o` | open story URL in browser (stay in list) |
| `t` / `n` / `b` | switch feed: top / new / best (feed lists only) |
| `]` / `[` | next / previous page |
| `/` | search input |
| `r` | retry after error |

## StoryDetail

| Key | Action |
|-----|--------|
| `enter` / `c` | open comments |
| `o` | open in browser |
| `b` | back |

## Comments

| Key | Action |
|-----|--------|
| `enter` | drill into selected comment's replies (level 1 only) |
| `b` | back (replies → top-level → detail) |
| `r` | retry after error |

## Conflict note

`b` = "best feed" in list view, "back" in deeper views. Deliberate: back from top-level list is meaningless, so no ambiguity. `esc` is always back.
