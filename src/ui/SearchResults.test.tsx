import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story } from '../api/firebase.js';
import { render } from '../test/inkHarness.js';
import { SearchResults } from './SearchResults.js';

const HITS_PER_PAGE = 20;
const TOTAL_HITS = 45;

function makePage(page: number): Story[] {
  const start = page * HITS_PER_PAGE;
  const count = Math.max(0, Math.min(HITS_PER_PAGE, TOTAL_HITS - start));
  return Array.from({ length: count }, (_, i) => {
    const id = start + i + 1;
    return { id, title: `Result ${id}`, url: `https://example.com/${id}`, by: 'alice', score: id, descendants: 0, time: 0 };
  });
}

const mocks = vi.hoisted(() => ({ searchStories: vi.fn() }));

vi.mock('../api/algolia.js', () => ({ searchStories: mocks.searchStories }));

const { searchStories } = mocks;

beforeEach(() => {
  vi.clearAllMocks();
  searchStories.mockImplementation((_query: string, page: number) =>
    Promise.resolve({
      stories: makePage(page),
      hasMore: (page + 1) * HITS_PER_PAGE < TOTAL_HITS,
      totalHits: TOTAL_HITS,
    }),
  );
});

function renderResults() {
  const onSelectStory = vi.fn();
  const onExit = vi.fn();
  const onSearchAgain = vi.fn();
  const instance = render(
    <SearchResults query="rust" onSelectStory={onSelectStory} onExit={onExit} onSearchAgain={onSearchAgain} />,
    80,
    14,
  );
  return { instance, onSelectStory, onExit, onSearchAgain };
}

describe('SearchResults', () => {
  it('shows the result count once the first page resolves', async () => {
    const { instance } = renderResults();
    await instance.waitUntilRenderFlush();

    expect(searchStories).toHaveBeenCalledWith('rust', 0);
    expect(instance.lastFrame()).toContain('45 results');

    instance.unmount();
  });

  it('appends the next page as selection nears the fetched edge', async () => {
    const { instance } = renderResults();
    await instance.waitUntilRenderFlush();
    expect(searchStories).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 11; i++) {
      instance.stdin.writeInput('j');
      await instance.waitUntilRenderFlush();
    }

    expect(searchStories).toHaveBeenCalledTimes(2);
    expect(searchStories).toHaveBeenLastCalledWith('rust', 1);

    instance.unmount();
  });
});
