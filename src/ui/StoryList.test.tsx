import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story } from '../api/firebase.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { StoryList } from './StoryList.js';

useTempDb('hn-bits-storylist-');

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
  const onTabChange = vi.fn();
  const onSelectStory = vi.fn();
  const onSearchRequested = vi.fn();
  const onAskAI = vi.fn();
  const instance = render(
    <StoryList
      feed="top"
      config={null}
      onFeedChange={onFeedChange}
      onTabChange={onTabChange}
      onSelectStory={onSelectStory}
      onSearchRequested={onSearchRequested}
      onAskAI={onAskAI}
    />,
    80,
    14,
  );
  return { instance, onFeedChange, onTabChange, onSelectStory, onSearchRequested, onAskAI };
}

describe('StoryList', () => {
  it('requests the previous tab on left arrow', async () => {
    const { instance, onTabChange } = renderList();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput(LEFT_ARROW);
    await instance.waitUntilRenderFlush();

    expect(onTabChange).toHaveBeenCalledWith(-1);
    instance.unmount();
  });

  it('toggles a bookmark on B, flashing a confirmation', async () => {
    const { instance } = renderList();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('B');
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('bookmarked ✓');
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
    expect(frame.match(/Story \d+/g)?.length).toBe(4);

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

  it('opens the summary panel on s, showing the setup hint with no config', async () => {
    const { instance } = renderList();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('s');
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('AI not configured');
    instance.unmount();
  });

  it('calls onAskAI with the selected story on a', async () => {
    const { instance, onAskAI } = renderList();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('a');
    await instance.waitUntilRenderFlush();

    expect(onAskAI).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    instance.unmount();
  });
});
