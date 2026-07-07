# Progress

Tracks implementation phases against `specs/`. Updated after each meaningful phase (CLAUDE.md rule 14).

## V1

| Phase | Status | Notes |
|-------|--------|-------|
| API: firebase.ts | done | matches specs/v1/02-api-firebase.md |
| API: algolia.ts | done | matches specs/v1/03-api-algolia.md (unused until search/comments land) |
| UI: StoryList (tracer bullet) | done | feeds top/new/best, pagination, j/k/o/t/n/b/[/]; `enter` is a documented no-op |
| UI: StoryDetail | not started | specs/v1/05-ui-story-detail.md |
| UI: Comments | not started | specs/v1/06-ui-comments.md |
| Search | not started | specs/v1/07-search.md |

## Known gaps / follow-ups

- `enter` on a story in StoryList is currently a no-op; wire to StoryDetail once that view exists.
- No Ink component rendering tests yet; only pure logic (`src/lib/*`) is unit tested. Revisit once StoryDetail/Comments need coverage.
- `hn search <query>` CLI subcommand intentionally omitted until the search view exists.
