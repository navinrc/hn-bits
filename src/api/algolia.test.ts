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

  it('omits the points filter when minPoints is 0 or absent', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ hits: [], nbPages: 1, nbHits: 0 }));
    await searchRecent('zig', { createdAfter: 1000, minPoints: 0 });

    const url = new URL(vi.mocked(fetch).mock.calls[0]![0] as string);
    expect(url.searchParams.get('numericFilters')).toBe('created_at_i>1000');
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
