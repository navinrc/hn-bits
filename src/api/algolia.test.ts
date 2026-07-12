import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchRecent } from './algolia.js';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('searchRecent', () => {
  it('builds a search_by_date request with created_at_i and points filters', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ hits: [], nbPages: 1, nbHits: 0 }));
    await searchRecent('postgres', { createdAfter: 1000, minPoints: 50 });

    const url = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(url.pathname).toBe('/api/v1/search_by_date');
    expect(url.searchParams.get('query')).toBe('postgres');
    expect(url.searchParams.get('tags')).toBe('story');
    expect(url.searchParams.get('numericFilters')).toBe('created_at_i>1000,points>=50');
    expect(url.searchParams.get('hitsPerPage')).toBe('50');
  });

  it('disables typo tolerance and prefix matching, so short queries do not stem-match unrelated words', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ hits: [], nbPages: 1, nbHits: 0 }));
    await searchRecent('Apple', { createdAfter: 1000 });

    const url = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(url.searchParams.get('typoTolerance')).toBe('false');
    expect(url.searchParams.get('queryType')).toBe('prefixNone');
  });

  it('omits the points filter when minPoints is 0 or absent', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ hits: [], nbPages: 1, nbHits: 0 }));
    await searchRecent('zig', { createdAfter: 1000, minPoints: 0 });

    const url = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(url.searchParams.get('numericFilters')).toBe('created_at_i>1000');
  });

  it('pushes num_comments as a server-side filter when only minComments is set', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ hits: [], nbPages: 1, nbHits: 0 }));
    await searchRecent('zig', { createdAfter: 1000, minComments: 5 });

    const url = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(url.searchParams.get('numericFilters')).toBe('created_at_i>1000,num_comments>=5');
  });

  it('skips both server-side numeric filters when minPoints and minComments are both set, filtering client-side instead', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        hits: [
          // fails points (10 < 20), passes comments (8 >= 5) -> kept via OR
          { objectID: '1', title: 'A', url: null, author: 'a', points: 10, num_comments: 8, created_at_i: 2000 },
          // fails both -> dropped
          { objectID: '2', title: 'B', url: null, author: 'b', points: 10, num_comments: 1, created_at_i: 2001 },
          // passes points -> kept
          { objectID: '3', title: 'C', url: null, author: 'c', points: 30, num_comments: 0, created_at_i: 2002 },
        ],
        nbPages: 1,
        nbHits: 3,
      }),
    );
    const stories = await searchRecent('apple', { createdAfter: 1000, minPoints: 20, minComments: 5 });

    const url = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(url.searchParams.get('numericFilters')).toBe('created_at_i>1000');
    expect(stories.map((s) => s.id)).toEqual([1, 3]);
  });

  it('maps hits to stories and drops hits with no title', async () => {
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        hits: [
          {
            objectID: '1',
            title: 'Postgres 18',
            url: 'https://example.com',
            author: 'alice',
            points: 100,
            num_comments: 5,
            created_at_i: 2000,
          },
          { objectID: '2', title: null, url: null, author: null, points: null, num_comments: null, created_at_i: 3000 },
        ],
        nbPages: 1,
        nbHits: 2,
      }),
    );
    const stories = await searchRecent('postgres', { createdAfter: 1000 });
    expect(stories).toEqual([
      { id: 1, title: 'Postgres 18', url: 'https://example.com', by: 'alice', score: 100, descendants: 5, time: 2000 },
    ]);
  });
});
