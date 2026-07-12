import { describe, expect, it, vi } from 'vitest';
import type { Story } from '../api/firebase.js';
import { toggleBookmark } from '../db/bookmarks.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { SavedList } from './SavedList.js';

useTempDb('hn-bits-savedlist-');

const RIGHT_ARROW = '[C';

function makeStory(id: number): Story {
  return { id, title: `Story ${id}`, url: `https://example.com/${id}`, by: 'alice', score: id, descendants: 0, time: 0 };
}

function renderSaved() {
  const onSelectStory = vi.fn();
  const onFeedChange = vi.fn();
  const onTabChange = vi.fn();
  const onSearchRequested = vi.fn();
  const onAskAI = vi.fn();
  const instance = render(
    <SavedList
      config={null}
      onSelectStory={onSelectStory}
      onFeedChange={onFeedChange}
      onTabChange={onTabChange}
      onSearchRequested={onSearchRequested}
      onAskAI={onAskAI}
    />,
    80,
    14,
  );
  return { instance, onSelectStory, onFeedChange, onTabChange, onSearchRequested, onAskAI };
}

describe('SavedList', () => {
  it('shows the empty state when there are no bookmarks', async () => {
    const { instance } = renderSaved();
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('no bookmarks yet');
    instance.unmount();
  });

  it('lists bookmarked stories newest first', async () => {
    toggleBookmark(makeStory(1));
    toggleBookmark(makeStory(2));
    const { instance } = renderSaved();
    await instance.waitUntilRenderFlush();
    const frame = instance.lastFrame();
    expect(frame.indexOf('Story 2')).toBeLessThan(frame.indexOf('Story 1'));
    instance.unmount();
  });

  it('removes the selected bookmark on B and flashes a confirmation', async () => {
    toggleBookmark(makeStory(1));
    const { instance } = renderSaved();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('B');
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('bookmark removed');
    expect(frame).not.toContain('Story 1');
    instance.unmount();
  });

  it('requests a tab change on left/right arrow', async () => {
    toggleBookmark(makeStory(1));
    const { instance, onTabChange } = renderSaved();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput(RIGHT_ARROW);
    await instance.waitUntilRenderFlush();

    expect(onTabChange).toHaveBeenCalledWith(1);
    instance.unmount();
  });

  it('opens comments for the selected story on enter', async () => {
    toggleBookmark(makeStory(1));
    const { instance, onSelectStory } = renderSaved();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSelectStory).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }));
    instance.unmount();
  });
});
