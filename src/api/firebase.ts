const BASE = 'https://hacker-news.firebaseio.com/v0';

export type Feed = 'top' | 'new' | 'best';

export interface Story {
  id: number;
  title: string;
  url?: string;
  by: string;
  score: number;
  descendants: number;
  time: number;
}

const FEED_PATHS: Record<Feed, string> = {
  top: 'topstories',
  new: 'newstories',
  best: 'beststories',
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json() as Promise<T>;
}

export function fetchStoryIds(feed: Feed): Promise<number[]> {
  return getJson<number[]>(`${BASE}/${FEED_PATHS[feed]}.json`);
}

interface RawItem {
  id: number;
  type?: string;
  deleted?: boolean;
  dead?: boolean;
  title?: string;
  url?: string;
  by?: string;
  score?: number;
  descendants?: number;
  time?: number;
}

export async function fetchStories(ids: number[]): Promise<Story[]> {
  const items = await Promise.all(
    ids.map((id) => getJson<RawItem | null>(`${BASE}/item/${id}.json`)),
  );
  return items
    .filter(
      (it): it is RawItem =>
        it != null && !it.deleted && !it.dead && it.title != null,
    )
    .map((it) => ({
      id: it.id,
      title: it.title!,
      url: it.url,
      by: it.by ?? '?',
      score: it.score ?? 0,
      descendants: it.descendants ?? 0,
      time: it.time ?? 0,
    }));
}

export function hnItemUrl(id: number): string {
  return `https://news.ycombinator.com/item?id=${id}`;
}
