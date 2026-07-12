import type { Story } from './firebase.js';

const BASE = 'https://hn.algolia.com/api/v1';

export interface CommentNode {
  id: number;
  author: string;
  text: string;
  time: number;
  children: CommentNode[];
}

interface AlgoliaItem {
  id: number;
  type: string;
  author: string | null;
  text: string | null;
  created_at_i: number;
  children: AlgoliaItem[];
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json() as Promise<T>;
}

function toNode(item: AlgoliaItem): CommentNode | null {
  // Deleted/dead comments come back with null author or text
  if (item.type !== 'comment' || item.author == null || item.text == null) {
    return null;
  }
  return {
    id: item.id,
    author: item.author,
    text: item.text,
    time: item.created_at_i,
    children: item.children
      .map(toNode)
      .filter((c): c is CommentNode => c != null),
  };
}

/** Fetch the full comment tree of a story in one request. */
export async function fetchComments(storyId: number): Promise<CommentNode[]> {
  const item = await getJson<AlgoliaItem>(`${BASE}/items/${storyId}`);
  return item.children.map(toNode).filter((c): c is CommentNode => c != null);
}

interface SearchHit {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string | null;
  points: number | null;
  num_comments: number | null;
  created_at_i: number;
}

interface SearchResponse {
  hits: SearchHit[];
  nbPages: number;
  nbHits: number;
}

export interface SearchResult {
  stories: Story[];
  hasMore: boolean;
  totalHits: number;
}

function hitToStory(hit: SearchHit): Story {
  return {
    id: Number(hit.objectID),
    title: hit.title!,
    url: hit.url ?? undefined,
    by: hit.author ?? '?',
    score: hit.points ?? 0,
    descendants: hit.num_comments ?? 0,
    time: hit.created_at_i,
  };
}

export async function searchStories(
  query: string,
  page = 0,
): Promise<SearchResult> {
  const params = new URLSearchParams({
    query,
    tags: 'story',
    page: String(page),
    hitsPerPage: '20',
  });
  const res = await getJson<SearchResponse>(`${BASE}/search?${params}`);
  return {
    stories: res.hits.filter((h) => h.title != null).map(hitToStory),
    hasMore: page + 1 < res.nbPages,
    totalHits: res.nbHits,
  };
}

export interface RecentSearchOptions {
  /** Unix seconds; only stories created after this are returned. */
  createdAfter: number;
  /** 0/undefined = no threshold. */
  minPoints?: number;
  hitsPerPage?: number;
}

/**
 * Recency-ordered search (subscription matching + watcher window rescans),
 * as opposed to searchStories' relevance ordering.
 */
export async function searchRecent(query: string, options: RecentSearchOptions): Promise<Story[]> {
  const numericFilters = [`created_at_i>${options.createdAfter}`];
  if (options.minPoints) numericFilters.push(`points>=${options.minPoints}`);
  const params = new URLSearchParams({
    query,
    tags: 'story',
    numericFilters: numericFilters.join(','),
    hitsPerPage: String(options.hitsPerPage ?? 50),
    typoTolerance: 'false',
    queryType: 'prefixNone',
  });
  const res = await getJson<SearchResponse>(`${BASE}/search_by_date?${params}`);
  return res.hits.filter((h) => h.title != null).map(hitToStory);
}
