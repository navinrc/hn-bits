import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatStream, checkOllama, ModelMissingError, OllamaDownError, OllamaError } from './ollama.js';

const cfg = { host: 'http://localhost:11434', model: 'llama3.2' };

function ndjsonResponse(lines: string[], init: ResponseInit = {}): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const line of lines) controller.enqueue(encoder.encode(line + '\n'));
      controller.close();
    },
  });
  return new Response(body, { status: 200, ...init });
}

async function collect(gen: AsyncGenerator<string>): Promise<string[]> {
  const out: string[] = [];
  for await (const chunk of gen) out.push(chunk);
  return out;
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('chatStream', () => {
  it('yields content deltas and stops on done', async () => {
    vi.mocked(fetch).mockResolvedValue(
      ndjsonResponse([
        JSON.stringify({ message: { role: 'assistant', content: 'The' }, done: false }),
        JSON.stringify({ message: { role: 'assistant', content: ' article' }, done: false }),
        JSON.stringify({ done: true }),
      ]),
    );
    const deltas = await collect(chatStream(cfg, [{ role: 'user', content: 'hi' }]));
    expect(deltas).toEqual(['The', ' article']);
  });

  it('buffers a partial line split across chunks', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        const full = JSON.stringify({ message: { content: 'hello' }, done: false }) + '\n' + JSON.stringify({ done: true }) + '\n';
        controller.enqueue(encoder.encode(full.slice(0, 10)));
        controller.enqueue(encoder.encode(full.slice(10)));
        controller.close();
      },
    });
    vi.mocked(fetch).mockResolvedValue(new Response(body, { status: 200 }));
    const deltas = await collect(chatStream(cfg, [{ role: 'user', content: 'hi' }]));
    expect(deltas).toEqual(['hello']);
  });

  it('throws OllamaDownError on network failure', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    await expect(collect(chatStream(cfg, []))).rejects.toThrow(OllamaDownError);
  });

  it('throws ModelMissingError on 404', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('model not found', { status: 404 }));
    await expect(collect(chatStream(cfg, []))).rejects.toThrow(ModelMissingError);
  });

  it('throws OllamaError on other non-2xx status', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('server error', { status: 500 }));
    await expect(collect(chatStream(cfg, []))).rejects.toThrow(OllamaError);
  });

  it('exits cleanly (no throw) when caller aborts', async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockImplementation(() => {
      controller.abort();
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    const deltas = await collect(chatStream(cfg, [], controller.signal));
    expect(deltas).toEqual([]);
  });
});

describe('checkOllama', () => {
  it('returns ok when model present', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ models: [{ name: 'llama3.2:latest' }] }), { status: 200 }),
    );
    await expect(checkOllama(cfg)).resolves.toEqual({ ok: true });
  });

  it('returns down reason when server unreachable', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    const result = await checkOllama(cfg);
    expect(result).toMatchObject({ ok: false, reason: 'down' });
  });

  it('returns model-missing reason when model absent from tags', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ models: [{ name: 'phi3:latest' }] }), { status: 200 }));
    const result = await checkOllama(cfg);
    expect(result).toMatchObject({ ok: false, reason: 'model-missing' });
  });
});
