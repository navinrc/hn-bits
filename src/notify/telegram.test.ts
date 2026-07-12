import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story } from '../api/firebase.js';
import type { Subscription } from '../db/subscriptions.js';
import { createTelegramNotifier, NotifyError } from './telegram.js';
import type { Match } from './notifier.js';

const subscription: Subscription = {
  id: 1,
  name: 'postgres',
  query: 'postgres',
  minPoints: 50,
  createdAt: 0,
  lastRunAt: null,
};

const story: Story = {
  id: 41211001,
  title: 'Postgres 18 released',
  url: 'https://example.com/article',
  by: 'someauthor',
  score: 312,
  descendants: 214,
  time: 0,
};

const match: Match = { subscriptions: [subscription], story };
const config = { botToken: 'TOKEN', chatId: 'CHAT' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createTelegramNotifier', () => {
  it('posts to the sendMessage endpoint with the bot token and chat id', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));
    await createTelegramNotifier(config).send(match);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0]!;
    expect(url).toBe('https://api.telegram.org/botTOKEN/sendMessage');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body).toMatchObject({ chat_id: 'CHAT', parse_mode: 'HTML', disable_web_page_preview: false });
  });

  it('includes the article link, HN discussion link, and escapes HTML', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));
    const xssStory: Story = { ...story, title: 'A <script> & "quotes"', by: '<bob>' };
    await createTelegramNotifier(config).send({ subscriptions: [subscription], story: xssStory });

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0]![1] as RequestInit).body as string);
    expect(body.text).toContain('🔔 <b>postgres</b>');
    expect(body.text).toContain('<a href="https://example.com/article">A &lt;script&gt; &amp; "quotes"</a>');
    expect(body.text).toContain('by &lt;bob&gt;');
    expect(body.text).toContain('<a href="https://news.ycombinator.com/item?id=41211001">HN discussion</a>');
  });

  it('joins multiple subscription names and escapes each', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));
    const subB: Subscription = { ...subscription, id: 2, name: 'a < b' };
    await createTelegramNotifier(config).send({ subscriptions: [subscription, subB], story });

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0]![1] as RequestInit).body as string);
    expect(body.text).toContain('🔔 <b>postgres, a &lt; b</b>');
  });

  it('omits the story link and HN discussion line for text posts', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: true }));
    const textStory: Story = { ...story, url: undefined };
    await createTelegramNotifier(config).send({ subscriptions: [subscription], story: textStory });

    const body = JSON.parse((vi.mocked(fetch).mock.calls[0]![1] as RequestInit).body as string);
    expect(body.text).toContain('<a href="https://news.ycombinator.com/item?id=41211001">Postgres 18 released</a>');
    expect(body.text).not.toContain('HN discussion');
  });

  it('retries once after a 429 honoring retry_after, then succeeds', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch)
      .mockResolvedValueOnce(jsonResponse({ ok: false, parameters: { retry_after: 2 } }, 429))
      .mockResolvedValueOnce(jsonResponse({ ok: true }));

    const sendPromise = createTelegramNotifier(config).send(match);
    await vi.advanceTimersByTimeAsync(2000);
    await sendPromise;

    expect(fetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it('throws NotifyError on a non-429 failure without retrying', async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: false }, 500));
    await expect(createTelegramNotifier(config).send(match)).rejects.toThrow(NotifyError);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws NotifyError on a second consecutive 429 (no double retry)', async () => {
    vi.useFakeTimers();
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ ok: false, parameters: { retry_after: 0 } }, 429));

    const sendPromise = createTelegramNotifier(config).send(match);
    const assertion = expect(sendPromise).rejects.toThrow(NotifyError);
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;

    expect(fetch).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
