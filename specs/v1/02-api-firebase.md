# Firebase API (`src/api/firebase.ts`)

Official HN Firebase API. Used **only** for story ID lists and story items — never for comments (one-request-per-item makes comment trees an N+1 disaster; Algolia covers those, see [03-api-algolia.md](03-api-algolia.md)).

Base URL: `https://hacker-news.firebaseio.com/v0`

## Endpoints used

| Feed | Endpoint | Returns |
|------|----------|---------|
| top  | `/topstories.json`  | up to 500 story IDs, ranked |
| new  | `/newstories.json`  | up to 500 story IDs, newest first |
| best | `/beststories.json` | up to ~200 story IDs |
| item | `/item/<id>.json`   | single item object (or `null`) |

## Exports

```ts
type Feed = 'top' | 'new' | 'best';

fetchStoryIds(feed: Feed): Promise<number[]>
fetchStories(ids: number[]): Promise<Story[]>
hnItemUrl(id: number): string   // https://news.ycombinator.com/item?id=<id>
```

## `fetchStories` behavior

- Caller passes a **page slice** of IDs (20 at a time — see [04-ui-story-list.md](04-ui-story-list.md)); the function fetches all of them concurrently (`Promise.all`). Page size caps concurrency, so no explicit pool needed.
- Filters out unusable items: `null` responses, `deleted`, `dead`, and items missing `title`.
- Consequence: a page may render with slightly fewer than 20 rows. Acceptable — no backfill in V1.
- Missing optional fields default: `by → '?'`, `score → 0`, `descendants → 0`, `time → 0`; `url` stays `undefined` for text posts.
- Output order follows input ID order (Promise.all preserves it), i.e. feed rank order.

## Errors

Any non-2xx or network failure rejects; the calling view shows the error message. No retry logic in V1.
