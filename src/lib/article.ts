import pkg from '../../package.json' with { type: 'json' };

export interface Article {
  title: string;
  text: string;
  truncated: boolean;
}

export class ExtractionError extends Error {
  constructor(public readonly reason: 'fetch-failed' | 'not-html' | 'unreadable') {
    super(reason);
  }
}

const FETCH_TIMEOUT_MS = 15_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const TEXT_BUDGET_CHARS = 16_000;

async function readCappedBody(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';

  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';
  while (bytesRead < MAX_BODY_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    bytesRead += value.byteLength;
    text += decoder.decode(value, { stream: true });
  }
  await reader.cancel().catch(() => {});
  return text;
}

function normalize(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join('\n\n');
}

function truncate(text: string, budget: number): { text: string; truncated: boolean } {
  if (text.length <= budget) return { text, truncated: false };
  const cut = text.lastIndexOf('\n\n', budget);
  return { text: text.slice(0, cut > 0 ? cut : budget), truncated: true };
}

/** Fetches a story URL and extracts readable article text. Throws ExtractionError; callers define fallback. */
export async function extractArticle(url: string, signal?: AbortSignal): Promise<Article> {
  const timeoutSignal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': `hn-bits/${pkg.version}`, Accept: 'text/html' },
      signal: combinedSignal,
    });
  } catch {
    throw new ExtractionError('fetch-failed');
  }
  if (!res.ok) throw new ExtractionError('fetch-failed');

  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) throw new ExtractionError('not-html');

  const html = await readCappedBody(res);

  const { JSDOM, VirtualConsole } = await import('jsdom');
  const { Readability } = await import('@mozilla/readability');

  const virtualConsole = new VirtualConsole();
  const dom = new JSDOM(html, { url, virtualConsole });
  const parsed = new Readability(dom.window.document).parse();

  if (!parsed?.textContent?.trim()) throw new ExtractionError('unreadable');

  const { text, truncated } = truncate(normalize(parsed.textContent), TEXT_BUDGET_CHARS);
  return { title: parsed.title ?? '', text, truncated };
}
