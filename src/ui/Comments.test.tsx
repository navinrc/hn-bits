import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommentNode } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import { render } from '../test/inkHarness.js';
import { Comments } from './Comments.js';

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
  const instance = render(<Comments story={story} onBack={onBack} />, 80, 14);
  return { instance, onBack };
}

describe('Comments', () => {
  it('shows story title and metadata in the header', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('Show HN: something great (example.com)');
    expect(frame).toContain('123 points · by alice · 0m ago · 3 comments');

    instance.unmount();
  });

  it('folds the selected node on space, hiding its children and showing the count', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('carol');

    instance.stdin.writeInput(' ');
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).not.toContain('carol');
    expect(frame).toContain('(+1)');

    instance.unmount();
  });

  it('collapses every node with children on C', async () => {
    const { instance } = renderComments();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('C');
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).not.toContain('carol');
    expect(frame).toContain('bob');
    expect(frame).toContain('dave');

    instance.unmount();
  });
});
