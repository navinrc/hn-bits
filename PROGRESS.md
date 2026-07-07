# Progress

Tracks implementation phases against `specs/`. Updated after each meaningful phase (CLAUDE.md rule 14).

## V1

| Phase | Status | Notes |
|-------|--------|-------|
| API: firebase.ts | done | matches specs/v1/02-api-firebase.md |
| API: algolia.ts | done | matches specs/v1/03-api-algolia.md (unused until search/comments land) |
| UI: StoryList (tracer bullet) | done | feeds top/new/best, pagination, j/k/o/t/n/b/[/], enter opens StoryDetail |
| UI: StoryDetail | done | title/domain/metadata, o opens browser, esc/b back; enter/c is a documented no-op |
| UI: Comments | not started | specs/v1/06-ui-comments.md |
| Search | not started | specs/v1/07-search.md |

## Known gaps / follow-ups

- `enter`/`c` in StoryDetail is currently a no-op; wire to Comments once that view exists.
- No Ink component rendering tests yet; only pure logic (`src/lib/*`) is unit tested. Revisit once Comments needs coverage.
- `hn search <query>` CLI subcommand intentionally omitted until the search view exists.
