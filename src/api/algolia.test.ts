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

  it('runs two separately server-filtered requests when both thresholds are active, and unions the results', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(input as string);
      const filters = url.searchParams.get('numericFilters');
      if (filters === 'created_at_i>1000,points>=20') {
        return jsonResponse({
          hits: [
            { objectID: '3', title: 'C', url: null, author: 'a', points: 30, num_comments: 0, created_at_i: 2002 },
            { objectID: '1', title: 'A', url: null, author: 'a', points: 25, num_comments: 8, created_at_i: 2000 },
          ],
          nbPages: 1,
          nbHits: 2,
        });
      }
      if (filters === 'created_at_i>1000,num_comments>=5') {
        return jsonResponse({
          hits: [
            // overlaps with story 1 above -> deduped
            { objectID: '1', title: 'A', url: null, author: 'a', points: 25, num_comments: 8, created_at_i: 2000 },
            // points-only miss, kept via comments
            { objectID: '4', title: 'D', url: null, author: 'a', points: 0, num_comments: 6, created_at_i: 2003 },
          ],
          nbPages: 1,
          nbHits: 2,
        });
      }
      throw new Error(`unexpected numericFilters: ${filters}`);
    });

    const stories = await searchRecent('apple', { createdAfter: 1000, minPoints: 20, minComments: 5 });

    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(2);
    // most recent first, story 4 (2003) > story 3 (2002) > story 1 (2000), no duplicate
    expect(stories.map((s) => s.id)).toEqual([4, 3, 1]);
  });

  it('trims the merged both-thresholds result to the caller-requested limit', async () => {
    vi.mocked(fetch).mockImplementation(async (input) => {
      const url = new URL(input as string);
      expect(url.searchParams.get('hitsPerPage')).toBe('50');
      const filters = url.searchParams.get('numericFilters');
      const hits = filters?.includes('points')
        ? Array.from({ length: 8 }, (_, i) => ({
            objectID: String(i),
            title: `story ${i}`,
            url: null,
            author: 'a',
            points: 20,
            num_comments: 0,
            created_at_i: 2000 + i,
          }))
        : [];
      return jsonResponse({ hits, nbPages: 1, nbHits: hits.length });
    });

    const stories = await searchRecent('apple', {
      createdAfter: 1000,
      minPoints: 20,
      minComments: 5,
      hitsPerPage: 5,
    });

    expect(stories).toHaveLength(5);
    // most recent first: story 7 (2007) down to story 3 (2003)
    expect(stories.map((s) => s.id)).toEqual([7, 6, 5, 4, 3]);
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
