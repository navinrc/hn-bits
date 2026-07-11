import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommentNode } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import { ExtractionError } from '../lib/article.js';
import { buildCommentsSummaryPrompt, buildListSummaryPrompt } from './summaryPrompts.js';

const mocks = vi.hoisted(() => ({
  extractArticle: vi.fn(),
  fetchComments: vi.fn(),
}));

vi.mock('../lib/article.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/article.js')>('../lib/article.js');
  return { ...actual, extractArticle: mocks.extractArticle };
});
vi.mock('../api/algolia.js', () => ({ fetchComments: mocks.fetchComments }));

const { extractArticle, fetchComments } = mocks;

function node(id: number, author: string, text: string): CommentNode {
  return { id, author, text, time: 0, children: [] };
}

const baseStory: Story = { id: 1, title: 'Postgres 18', by: 'x', score: 10, descendants: 1, time: 0 };

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildListSummaryPrompt', () => {
  it('summarizes the article when a url is present and extraction succeeds', async () => {
    extractArticle.mockResolvedValue({ title: 't', text: 'article body', truncated: false });
    const story = { ...baseStory, url: 'https://example.com' };
    const result = await buildListSummaryPrompt(story, new AbortController().signal);
    expect(result.prompt).toContain('article body');
    expect(result.prompt).toContain('Postgres 18');
    expect(result.notice).toBeUndefined();
  });

  it('notes truncation when the article was truncated', async () => {
    extractArticle.mockResolvedValue({ title: 't', text: 'article body', truncated: true });
    const story = { ...baseStory, url: 'https://example.com' };
    const result = await buildListSummaryPrompt(story, new AbortController().signal);
    expect(result.notice).toBe('article truncated to 16k chars');
  });

  it('falls back to post text when extraction fails and story.text is present', async () => {
    extractArticle.mockRejectedValue(new ExtractionError('not-html'));
    const story = { ...baseStory, url: 'https://example.com', text: 'the post body' };
    const result = await buildListSummaryPrompt(story, new AbortController().signal);
    expect(result.prompt).toContain('the post body');
    expect(result.notice).toContain('article unavailable (not-html)');
    expect(result.notice).toContain('post text');
  });

  it('falls back to thread when extraction fails and story.text is absent', async () => {
    extractArticle.mockRejectedValue(new ExtractionError('fetch-failed'));
    fetchComments.mockResolvedValue([node(1, 'alice', 'hello')]);
    const story = { ...baseStory, url: 'https://example.com' };
    const result = await buildListSummaryPrompt(story, new AbortController().signal);
    expect(result.prompt).toContain('alice: hello');
    expect(result.notice).toContain('article unavailable (fetch-failed)');
    expect(result.notice).toContain('thread');
  });

  it('uses post text directly when there is no url', async () => {
    const story = { ...baseStory, text: 'ask hn body' };
    const result = await buildListSummaryPrompt(story, new AbortController().signal);
    expect(extractArticle).not.toHaveBeenCalled();
    expect(result.prompt).toContain('ask hn body');
    expect(result.notice).toBeUndefined();
  });

  it('fetches the thread when there is no url and no text', async () => {
    fetchComments.mockResolvedValue([node(1, 'bob', 'first comment')]);
    const result = await buildListSummaryPrompt(baseStory, new AbortController().signal);
    expect(result.prompt).toContain('bob: first comment');
  });
});

describe('buildCommentsSummaryPrompt', () => {
  it('builds a thread prompt from the loaded comment tree', () => {
    const result = buildCommentsSummaryPrompt(baseStory, [node(1, 'alice', 'hi')]);
    expect(result.prompt).toContain('alice: hi');
    expect(result.prompt).toContain('Postgres 18');
  });
});
