import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story } from '../api/firebase.js';
import { render } from '../test/inkHarness.js';
import { StoryList } from './StoryList.js';

const TOTAL_IDS = 50;
const ALL_IDS = Array.from({ length: TOTAL_IDS }, (_, i) => i + 1);

function makeStories(ids: number[]): Story[] {
  return ids.map((id) => ({
    id,
    title: `Story ${id}`,
    url: `https://example.com/${id}`,
    by: 'alice',
    score: id,
    descendants: 0,
    time: 0,
  }));
}

const mocks = vi.hoisted(() => ({
  fetchStoryIds: vi.fn(),
  fetchStories: vi.fn(),
}));

vi.mock('../api/firebase.js', async () => {
  const actual = await vi.importActual<typeof import('../api/firebase.js')>('../api/firebase.js');
  return {
    ...actual,
    fetchStoryIds: mocks.fetchStoryIds,
    fetchStories: mocks.fetchStories,
  };
});

const { fetchStoryIds, fetchStories } = mocks;

beforeEach(() => {
  vi.clearAllMocks();
  fetchStoryIds.mockResolvedValue(ALL_IDS);
  fetchStories.mockImplementation((ids: number[]) => Promise.resolve(makeStories(ids)));
});

const LEFT_ARROW = '[D';

function renderList() {
  const onFeedChange = vi.fn();
  const onSelectStory = vi.fn();
  const onSearchRequested = vi.fn();
  const instance = render(
    <StoryList
      feed="top"
      onFeedChange={onFeedChange}
      onSelectStory={onSelectStory}
      onSearchRequested={onSearchRequested}
    />,
    80,
    14,
  );
  return { instance, onFeedChange, onSelectStory, onSearchRequested };
}

describe('StoryList', () => {
  it('switches to the previous tab on left arrow', async () => {
    const { instance, onFeedChange } = renderList();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput(LEFT_ARROW);
    await instance.waitUntilRenderFlush();

    expect(onFeedChange).toHaveBeenCalledWith('show');
    instance.unmount();
  });

  it('scrolls the window down as selection moves past the visible rows', async () => {
    const { instance } = renderList();
    await instance.waitUntilRenderFlush();

    for (let i = 0; i < 15; i++) {
      instance.stdin.writeInput('j');
      await instance.waitUntilRenderFlush();
    }

    const frame = instance.lastFrame();
    expect(frame).toContain('Story 16');
    expect(frame.match(/Story \d+/g)?.length).toBe(6);

    instance.unmount();
  });

  it('fetches the next batch as selection nears the fetched edge', async () => {
    const { instance } = renderList();
    await instance.waitUntilRenderFlush();
    expect(fetchStories).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 29; i++) {
      instance.stdin.writeInput('j');
      await instance.waitUntilRenderFlush();
    }

    expect(fetchStories).toHaveBeenCalledTimes(2);
    expect(fetchStories).toHaveBeenLastCalledWith(ALL_IDS.slice(30, 50));

    instance.unmount();
  });
});
