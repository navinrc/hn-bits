import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Config } from '../lib/config.js';
import { render } from '../test/inkHarness.js';
import { SummaryPanel } from './SummaryPanel.js';

const mocks = vi.hoisted(() => ({ chatStream: vi.fn() }));

vi.mock('../ai/ollama.js', async () => {
  const actual = await vi.importActual<typeof import('../ai/ollama.js')>('../ai/ollama.js');
  return { ...actual, chatStream: mocks.chatStream };
});

const { chatStream } = mocks;

const config: Config = { ollama: { host: 'http://localhost:11434', model: 'llama3.2' } };

async function* streamOf(...parts: string[]): AsyncGenerator<string> {
  for (const part of parts) yield part;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SummaryPanel', () => {
  it('shows the setup hint when config is missing', async () => {
    const onClose = vi.fn();
    const instance = render(
      <SummaryPanel config={null} buildPrompt={vi.fn()} height={10} width={60} onClose={onClose} />,
    );
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('AI not configured');
  });

  it('streams tokens from buildPrompt + chatStream into the panel', async () => {
    chatStream.mockReturnValue(streamOf('Hello', ' world'));
    const buildPrompt = vi.fn().mockResolvedValue({ prompt: 'summarize this' });
    const instance = render(
      <SummaryPanel config={config} buildPrompt={buildPrompt} height={10} width={60} onClose={vi.fn()} />,
    );
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('Hello world');
    expect(instance.lastFrame()).toContain('llama3.2');
  });

  it('shows a notice line from buildPrompt', async () => {
    chatStream.mockReturnValue(streamOf('ok'));
    const buildPrompt = vi.fn().mockResolvedValue({ prompt: 'x', notice: 'article truncated to 16k chars' });
    const instance = render(
      <SummaryPanel config={config} buildPrompt={buildPrompt} height={10} width={60} onClose={vi.fn()} />,
    );
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('article truncated to 16k chars');
  });

  it('renders the tailored error hint when chatStream throws', async () => {
    chatStream.mockImplementation(async function* () {
      throw new Error('boom');
    });
    const buildPrompt = vi.fn().mockResolvedValue({ prompt: 'x' });
    const instance = render(
      <SummaryPanel config={config} buildPrompt={buildPrompt} height={10} width={60} onClose={vi.fn()} />,
    );
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('boom');
  });

  it('closes on esc', async () => {
    chatStream.mockReturnValue(streamOf('ok'));
    const buildPrompt = vi.fn().mockResolvedValue({ prompt: 'x' });
    const onClose = vi.fn();
    const instance = render(
      <SummaryPanel config={config} buildPrompt={buildPrompt} height={10} width={60} onClose={onClose} />,
    );
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('');
    // Ink buffers a lone ESC for 20ms in case it's the start of a longer sequence.
    await new Promise((resolve) => setTimeout(resolve, 30));
    await instance.waitUntilRenderFlush();
    expect(onClose).toHaveBeenCalled();
  });

  it('regenerates on s, calling buildPrompt again', async () => {
    chatStream.mockReturnValue(streamOf('ok'));
    const buildPrompt = vi.fn().mockResolvedValue({ prompt: 'x' });
    const instance = render(
      <SummaryPanel config={config} buildPrompt={buildPrompt} height={10} width={60} onClose={vi.fn()} />,
    );
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('s');
    await instance.waitUntilRenderFlush();
    expect(buildPrompt).toHaveBeenCalledTimes(2);
  });
});
