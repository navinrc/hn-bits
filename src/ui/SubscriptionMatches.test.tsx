import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story } from '../api/firebase.js';
import type { Subscription } from '../db/subscriptions.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { SubscriptionMatches } from './SubscriptionMatches.js';

useTempDb('hn-bits-submatches-');

const subscription: Subscription = {
  id: 1,
  name: 'postgres',
  query: 'postgres',
  minPoints: 0,
  createdAt: 0,
  lastRunAt: null,
};

function makeStory(id: number): Story {
  return { id, title: `Story ${id}`, url: `https://example.com/${id}`, by: 'alice', score: id, descendants: 0, time: 0 };
}

const mocks = vi.hoisted(() => ({ searchRecent: vi.fn() }));
vi.mock('../api/algolia.js', () => ({ searchRecent: mocks.searchRecent }));
const { searchRecent } = mocks;

beforeEach(() => {
  vi.clearAllMocks();
});

function renderMatches() {
  const onSelectStory = vi.fn();
  const onBack = vi.fn();
  const onAskAI = vi.fn();
  const instance = render(
    <SubscriptionMatches
      subscription={subscription}
      config={null}
      onSelectStory={onSelectStory}
      onBack={onBack}
      onAskAI={onAskAI}
    />,
    80,
    14,
  );
  return { instance, onSelectStory, onBack, onAskAI };
}

describe('SubscriptionMatches', () => {
  it('shows the sub header and the empty state when there are no matches', async () => {
    searchRecent.mockResolvedValue([]);
    const { instance } = renderMatches();
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('sub: postgres "postgres"');
    expect(frame).toContain('no matches in the last 7 days');
    instance.unmount();
  });

  it('lists matches from searchRecent', async () => {
    searchRecent.mockResolvedValue([makeStory(1), makeStory(2)]);
    const { instance } = renderMatches();
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('Story 1');
    expect(frame).toContain('Story 2');
    instance.unmount();
  });

  it('goes back to the manager on esc', async () => {
    searchRecent.mockResolvedValue([]);
    const { instance, onBack } = renderMatches();
    await instance.waitUntilRenderFlush();

    // A lone ESC byte is buffered as a "pending" escape sequence (it might be the
    // start of an arrow-key CSI code) until Ink's 20ms flush timer fires.
    instance.stdin.writeInput('\x1b');
    await new Promise((resolve) => setTimeout(resolve, 30));
    await instance.waitUntilRenderFlush();

    expect(onBack).toHaveBeenCalled();
    instance.unmount();
  });

  it('toggles a bookmark on B and flashes a confirmation', async () => {
    searchRecent.mockResolvedValue([makeStory(1)]);
    const { instance } = renderMatches();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('B');
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('bookmarked ✓');
    instance.unmount();
  });

  it('refetches on r', async () => {
    searchRecent.mockResolvedValue([]);
    const { instance } = renderMatches();
    await instance.waitUntilRenderFlush();
    expect(searchRecent).toHaveBeenCalledTimes(1);

    instance.stdin.writeInput('r');
    await instance.waitUntilRenderFlush();

    expect(searchRecent).toHaveBeenCalledTimes(2);
    instance.unmount();
  });
});
