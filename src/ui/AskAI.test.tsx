import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CommentNode } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import type { Config } from '../lib/config.js';
import { render } from '../test/inkHarness.js';
import { AskAI } from './AskAI.js';

const mocks = vi.hoisted(() => ({
  chatStream: vi.fn(),
  checkOllama: vi.fn(),
  extractArticle: vi.fn(),
  fetchComments: vi.fn(),
}));

vi.mock('../ai/ollama.js', async () => {
  const actual = await vi.importActual<typeof import('../ai/ollama.js')>('../ai/ollama.js');
  return { ...actual, chatStream: mocks.chatStream, checkOllama: mocks.checkOllama };
});
vi.mock('../lib/article.js', async () => {
  const actual = await vi.importActual<typeof import('../lib/article.js')>('../lib/article.js');
  return { ...actual, extractArticle: mocks.extractArticle };
});
vi.mock('../api/algolia.js', () => ({ fetchComments: mocks.fetchComments }));

const { chatStream, checkOllama, extractArticle, fetchComments } = mocks;

const config: Config = { ollama: { host: 'http://localhost:11434', model: 'llama3.2' } };
const story: Story = { id: 1, title: 'Postgres 18', url: 'https://example.com', by: 'x', score: 10, descendants: 1, time: 0 };
const tree: CommentNode[] = [{ id: 1, author: 'alice', text: 'hello', time: 0, children: [] }];

async function* streamOf(...parts: string[]): AsyncGenerator<string> {
  for (const part of parts) yield part;
}

beforeEach(() => {
  vi.clearAllMocks();
  checkOllama.mockResolvedValue({ ok: true });
  extractArticle.mockResolvedValue({ title: 't', text: 'article body', truncated: false });
  fetchComments.mockResolvedValue(tree);
});

function renderAskAI(overrides: Partial<{ config: Config | null; comments: CommentNode[] | null }> = {}) {
  const onBack = vi.fn();
  const instance = render(
    <AskAI
      story={story}
      comments={overrides.comments ?? null}
      config={overrides.config === undefined ? config : overrides.config}
      onBack={onBack}
    />,
    80,
    20,
  );
  return { instance, onBack };
}

describe('AskAI', () => {
  it('shows the setup hint when config is missing', async () => {
    const { instance } = renderAskAI({ config: null });
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('AI not configured');
  });

  it('shows the tailored hint when Ollama health check fails', async () => {
    checkOllama.mockResolvedValue({ ok: false, reason: 'down', detail: 'Ollama not reachable at http://localhost:11434 — is it running?' });
    const { instance } = renderAskAI();
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('Ollama not reachable');
  });

  it('fetches the thread when launched without preloaded comments, then answers a question', async () => {
    chatStream.mockReturnValue(streamOf('The', ' answer'));
    const { instance } = renderAskAI({ comments: null });
    await instance.waitUntilRenderFlush();
    await instance.waitUntilRenderFlush();
    expect(fetchComments).toHaveBeenCalledWith(story.id);
    expect(instance.lastFrame()).toContain('> ▊');

    for (const ch of 'hi?') instance.stdin.writeInput(ch);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('The answer');
  });

  it('does not re-fetch the thread when comments are preloaded', async () => {
    chatStream.mockReturnValue(streamOf('ok'));
    const { instance } = renderAskAI({ comments: tree });
    await instance.waitUntilRenderFlush();
    expect(fetchComments).not.toHaveBeenCalled();
    instance.unmount();
  });

  it('leaves the view on esc when idle', async () => {
    const { instance, onBack } = renderAskAI();
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('');
    await new Promise((resolve) => setTimeout(resolve, 30));
    await instance.waitUntilRenderFlush();
    expect(onBack).toHaveBeenCalled();
  });
});
