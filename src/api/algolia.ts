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
    stories: res.hits
      .filter((h) => h.title != null)
      .map((h) => ({
        id: Number(h.objectID),
        title: h.title!,
        url: h.url ?? undefined,
        by: h.author ?? '?',
        score: h.points ?? 0,
        descendants: h.num_comments ?? 0,
        time: h.created_at_i,
      })),
    hasMore: page + 1 < res.nbPages,
    totalHits: res.nbHits,
  };
}
