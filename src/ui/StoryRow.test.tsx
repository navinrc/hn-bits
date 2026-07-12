import { describe, expect, it } from 'vitest';
import type { Story } from '../api/firebase.js';
import { toggleBookmark } from '../db/bookmarks.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { StoryRow } from './StoryRow.js';

useTempDb('hn-bits-storyrow-');

const WIDTH = 100;

const story: Story = {
  id: 1,
  title: 'Show HN: Microsoft releases Flint, a visualization language for AI agents',
  url: 'https://microsoft.github.io/flint',
  by: 'chenglong-hn',
  score: 251,
  descendants: 99,
  time: Math.floor(Date.now() / 1000) - 43200,
};

describe('StoryRow', () => {
  // A title+hostname combo that exactly fills the terminal width triggers a VT100
  // delayed-wrap that corrupts Ink's cursor position for the row below it — confirmed
  // live under tmux (selection background silently dropped from the meta line).
  it('never lets the title line reach the literal terminal width', async () => {
    const instance = render(<StoryRow story={story} rank={11} rankWidth={2} isSelected width={WIDTH} />, WIDTH, 5);
    await instance.waitUntilRenderFlush();

    const lines = instance.lastFrame().split('\n');
    for (const line of lines) {
      expect(line.length).toBeLessThan(WIDTH);
    }
    instance.unmount();
  });

  it('shows no star for a story that is not bookmarked', async () => {
    const instance = render(<StoryRow story={story} rank={1} rankWidth={1} isSelected={false} width={WIDTH} />, WIDTH, 5);
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).not.toContain('★');
    instance.unmount();
  });

  it('shows a ★ prefix on the meta line for a bookmarked story', async () => {
    toggleBookmark(story);
    const instance = render(<StoryRow story={story} rank={1} rankWidth={1} isSelected={false} width={WIDTH} />, WIDTH, 5);
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('★ 251 points');
    instance.unmount();
  });
});
