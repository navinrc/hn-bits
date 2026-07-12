import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommentNode } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { Comments } from './Comments.js';

useTempDb('hn-bits-comments-');

const now = Math.floor(Date.now() / 1000);

const story: Story = {
  id: 1,
  title: 'Show HN: something great',
  url: 'https://example.com/post',
  by: 'alice',
  score: 123,
  descendants: 3,
  time: now,
};

const tree: CommentNode[] = [
  {
    id: 10,
    author: 'bob',
    text: 'top level reply',
    time: now,
    children: [{ id: 11, author: 'carol', text: 'nested reply', time: now, children: [] }],
  },
  { id: 12, author: 'dave', text: 'another top level', time: now, children: [] },
];

const mocks = vi.hoisted(() => ({ fetchComments: vi.fn() }));

vi.mock('../api/algolia.js', async () => {
  const actual = await vi.importActual<typeof import('../api/algolia.js')>('../api/algolia.js');
  return { ...actual, fetchComments: mocks.fetchComments };
});

const { fetchComments } = mocks;

beforeEach(() => {
  vi.clearAllMocks();
  fetchComments.mockResolvedValue(tree);
});

function renderComments() {
  const onBack = vi.fn();
  const onAskAI = vi.fn();
  const instance = render(<Comments story={story} config={null} onBack={onBack} onAskAI={onAskAI} />, 80, 15);
  return { instance, onBack, onAskAI };
}

describe('Comments', () => {
  it('shows story title and metadata in the header', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('Show HN: something great');
    expect(frame).toContain('▲ 123 points by alice 0m | 3 comments');
    expect(frame).toContain('https://example.com/post');

    instance.unmount();
  });

  it('collapses every node with children by default, still showing its own body and a reply badge', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).not.toContain('carol');
    expect(frame).toContain('bob');
    expect(frame).toContain('top level reply');
    expect(frame).toContain('1 reply');

    instance.unmount();
  });

  it('unfolds the selected node on space, revealing its children', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput(' ');
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('carol');

    instance.unmount();
  });

  it('collapses every node into header-only on C, hiding bodies and showing [N more]', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('C');
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).not.toContain('carol');
    expect(frame).not.toContain('top level reply');
    expect(frame).not.toContain('another top level');
    expect(frame).toContain('bob');
    expect(frame).toContain('dave');
    expect(frame).toContain('[1 more]');

    instance.unmount();
  });

  it('reveals a header-only node on space without also expanding its children', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('C');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(' ');
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('top level reply');
    expect(frame).not.toContain('carol');

    instance.unmount();
  });

  it('toggles a C-originated leaf back to header-only on a second space', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('C');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('j');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(' ');
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('another top level');

    instance.stdin.writeInput(' ');
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).not.toContain('another top level');
    expect(frame).toContain('dave');

    instance.unmount();
  });

  it('keeps space a no-op on a leaf that never entered header-only', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('j');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(' ');
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('another top level');

    instance.unmount();
  });

  // A selected-row line whose painted content (indent + bar + text + padding) exactly
  // fills the terminal width triggers a VT100 delayed-wrap that drops the selection
  // bar/stripe from the following line — confirmed live under tmux.
  it('never lets a selected row line reach the literal terminal width', async () => {
    fetchComments.mockResolvedValue([
      { id: 20, author: 'erin', text: 'y'.repeat(300), time: now, children: [] },
    ]);
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    const selectedLines = instance
      .lastFrame()
      .split('\n')
      .filter((line) => line.trimStart().startsWith('│') && line.includes('y'.repeat(20)));
    expect(selectedLines.length).toBeGreaterThan(1);
    for (const line of selectedLines) {
      expect(line.length, JSON.stringify(line)).toBeLessThan(80);
    }

    instance.unmount();
  });

  it('resets to the default collapsed state on E after C', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('C');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('E');
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('top level reply');
    expect(frame).toContain('another top level');
    expect(frame).not.toContain('carol');
    expect(frame).toContain('1 reply');

    instance.unmount();
  });

  it('opens the summary panel on s, showing the setup hint with no config', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('s');
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('AI not configured');
    instance.unmount();
  });

  it('calls onAskAI with the loaded comment tree on a', async () => {
    const { instance, onAskAI } = renderComments();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('a');
    await instance.waitUntilRenderFlush();

    expect(onAskAI).toHaveBeenCalledWith(tree);
    instance.unmount();
  });
});
