import type { Config } from '../lib/config.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class OllamaDownError extends Error {}

export class ModelMissingError extends Error {}

export class OllamaError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export class TimeoutError extends Error {}

const IDLE_TIMEOUT_MS = 60_000;

interface ChatChunk {
  message?: { content?: string };
  done?: boolean;
}

function parseLines(buffer: string): { chunks: ChatChunk[]; rest: string } {
  const lines = buffer.split('\n');
  const rest = lines.pop() ?? '';
  const chunks = lines.filter((line) => line.trim()).map((line) => JSON.parse(line) as ChatChunk);
  return { chunks, rest };
}

/** Streams content deltas from Ollama's chat endpoint. Yields nothing further and returns on caller-initiated abort. */
export async function* chatStream(
  cfg: Config['ollama'],
  messages: ChatMessage[],
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const controller = new AbortController();
  const onAbort = (): void => controller.abort();
  signal?.addEventListener('abort', onAbort);

  let timedOut = false;
  let idleTimer: ReturnType<typeof setTimeout>;
  const resetIdle = (): void => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, IDLE_TIMEOUT_MS);
  };

  try {
    let res: Response;
    try {
      resetIdle();
      res = await fetch(`${cfg.host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: cfg.model, messages, stream: true }),
        signal: controller.signal,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        if (timedOut) throw new TimeoutError(`Ollama request timed out after ${IDLE_TIMEOUT_MS / 1000}s`);
        return;
      }
      throw new OllamaDownError(`Ollama not reachable at ${cfg.host} — is it running?`);
    }

    if (!res.ok) {
      const bodyText = await res.text().catch(() => '');
      if (res.status === 404 || /model.*not found/i.test(bodyText)) {
        throw new ModelMissingError(`model ${cfg.model} not found — ollama pull ${cfg.model}`);
      }
      throw new OllamaError(res.status, `${res.status} ${bodyText.split('\n')[0]}`);
    }
    if (!res.body) throw new OllamaError(res.status, 'empty response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) return;
        resetIdle();
        buffer += decoder.decode(value, { stream: true });
        const { chunks, rest } = parseLines(buffer);
        buffer = rest;
        for (const chunk of chunks) {
          if (chunk.message?.content) yield chunk.message.content;
          if (chunk.done) return;
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        if (timedOut) throw new TimeoutError(`Ollama request timed out after ${IDLE_TIMEOUT_MS / 1000}s`);
        return;
      }
      throw err;
    }
  } finally {
    clearTimeout(idleTimer!);
    signal?.removeEventListener('abort', onAbort);
  }
}

interface TagsResponse {
  models?: { name: string }[];
}

/** Health probe distinguishing "server down" from "model missing" so callers can render tailored hints. */
export async function checkOllama(
  cfg: Config['ollama'],
): Promise<{ ok: true } | { ok: false; reason: 'down' | 'model-missing'; detail: string }> {
  let res: Response;
  try {
    res = await fetch(`${cfg.host}/api/tags`, { signal: AbortSignal.timeout(5000) });
  } catch {
    return { ok: false, reason: 'down', detail: `Ollama not reachable at ${cfg.host} — is it running?` };
  }
  if (!res.ok) {
    return { ok: false, reason: 'down', detail: `${res.status} ${res.statusText}` };
  }

  const data = (await res.json()) as TagsResponse;
  const models = data.models ?? [];
  const hasModel = models.some((m) => m.name === cfg.model || m.name.startsWith(`${cfg.model}:`));
  if (!hasModel) {
    return {
      ok: false,
      reason: 'model-missing',
      detail: `model ${cfg.model} not found — ollama pull ${cfg.model}`,
    };
  }
  return { ok: true };
}
