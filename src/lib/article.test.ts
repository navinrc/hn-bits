import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtractionError, extractArticle } from './article.js';

function htmlResponse(html: string, contentType = 'text/html; charset=utf-8'): Response {
  return new Response(html, { status: 200, headers: { 'content-type': contentType } });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('extractArticle', () => {
  it('extracts readable text from an article page', async () => {
    const html = `<html><body><article><h1>Title</h1><p>${'word '.repeat(60)}</p></article></body></html>`;
    vi.mocked(fetch).mockResolvedValue(htmlResponse(html));
    const article = await extractArticle('https://example.com/post');
    expect(article.text.length).toBeGreaterThan(0);
    expect(article.truncated).toBe(false);
  });

  it('throws fetch-failed on network error', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('fetch failed'));
    await expect(extractArticle('https://example.com')).rejects.toMatchObject({ reason: 'fetch-failed' } satisfies Partial<ExtractionError>);
  });

  it('throws fetch-failed on non-2xx status', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('nope', { status: 500 }));
    await expect(extractArticle('https://example.com')).rejects.toMatchObject({ reason: 'fetch-failed' });
  });

  it('throws not-html for non-html content-type', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('%PDF-1.4', { status: 200, headers: { 'content-type': 'application/pdf' } }));
    await expect(extractArticle('https://example.com/doc.pdf')).rejects.toMatchObject({ reason: 'not-html' });
  });

  it('throws unreadable when Readability finds no content', async () => {
    vi.mocked(fetch).mockResolvedValue(htmlResponse('<html><body></body></html>'));
    await expect(extractArticle('https://example.com')).rejects.toMatchObject({ reason: 'unreadable' });
  });

  it('truncates long articles to the char budget at a paragraph boundary', async () => {
    const paragraph = `${'word '.repeat(400)}\n\n`;
    const html = `<html><body><article>${Array(50).fill(`<p>${paragraph}</p>`).join('')}</article></body></html>`;
    vi.mocked(fetch).mockResolvedValue(htmlResponse(html));
    const article = await extractArticle('https://example.com/long');
    expect(article.truncated).toBe(true);
    expect(article.text.length).toBeLessThanOrEqual(16_000);
  });
});
