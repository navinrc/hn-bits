import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story } from './api/firebase.js';
import type { Subscription } from './db/subscriptions.js';

const mocks = vi.hoisted(() => ({
  searchRecent: vi.fn(),
  isSeen: vi.fn(),
  markSeen: vi.fn(),
  listSubscriptions: vi.fn(),
  touchLastRun: vi.fn(),
  loadConfig: vi.fn(),
  send: vi.fn(),
  desktopSend: vi.fn(),
  createDesktopNotifier: vi.fn(),
}));

vi.mock('./api/algolia.js', () => ({ searchRecent: mocks.searchRecent }));
vi.mock('./db/seen.js', () => ({ isSeen: mocks.isSeen, markSeen: mocks.markSeen }));
vi.mock('./db/subscriptions.js', () => ({
  listSubscriptions: mocks.listSubscriptions,
  touchLastRun: mocks.touchLastRun,
}));
vi.mock('./lib/config.js', () => ({ loadConfig: mocks.loadConfig }));
vi.mock('./notify/telegram.js', () => ({
  createTelegramNotifier: () => ({ name: 'telegram', send: mocks.send }),
}));
vi.mock('./notify/desktop.js', () => ({ createDesktopNotifier: mocks.createDesktopNotifier }));

const { runWatch } = await import('./watch.js');

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return { id: 1, name: 'postgres', query: 'postgres', minPoints: 0, createdAt: 0, lastRunAt: null, ...overrides };
}

function makeStory(overrides: Partial<Story> = {}): Story {
  return { id: 1, title: 'Postgres 18', by: 'alice', score: 100, descendants: 5, time: 1000, ...overrides };
}

const enabledConfig = { ollama: { host: '', model: '' }, telegram: { enabled: true, botToken: 't', chatId: 'c' } };
const desktopOnlyConfig = {
  ollama: { host: '', model: '' },
  desktopNotifications: { enabled: true, timeoutSeconds: 10 },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.loadConfig.mockReturnValue(enabledConfig);
  mocks.isSeen.mockReturnValue(false);
  mocks.send.mockResolvedValue(undefined);
  mocks.desktopSend.mockResolvedValue(undefined);
  mocks.createDesktopNotifier.mockReturnValue({ name: 'desktop', send: mocks.desktopSend });
});

describe('runWatch', () => {
  it('exits 2 when no notifier is configured', async () => {
    mocks.loadConfig.mockReturnValue({ ollama: { host: '', model: '' } });
    const code = await runWatch({ dryRun: false });
    expect(code).toBe(2);
    expect(mocks.listSubscriptions).not.toHaveBeenCalled();
  });

  it('passes the notifier gate with desktop-only config and marks matches seen', async () => {
    const sub = makeSub();
    mocks.loadConfig.mockReturnValue(desktopOnlyConfig);
    mocks.listSubscriptions.mockReturnValue([sub]);
    mocks.searchRecent.mockResolvedValue([makeStory({ id: 42 })]);

    const code = await runWatch({ dryRun: false });

    expect(code).toBe(0);
    expect(mocks.createDesktopNotifier).toHaveBeenCalledWith({ timeoutSeconds: 10 });
    expect(mocks.desktopSend).toHaveBeenCalledWith({ subscriptions: [sub], story: expect.objectContaining({ id: 42 }) });
    expect(mocks.markSeen).toHaveBeenCalledWith(42, 1, expect.any(Number));
  });

  it('exits 0 touching nothing when desktop is the only notifier and alerter is missing', async () => {
    mocks.loadConfig.mockReturnValue(desktopOnlyConfig);
    mocks.createDesktopNotifier.mockReturnValue(null);

    const code = await runWatch({ dryRun: false });

    expect(code).toBe(0);
    expect(mocks.listSubscriptions).not.toHaveBeenCalled();
    expect(mocks.markSeen).not.toHaveBeenCalled();
    expect(mocks.touchLastRun).not.toHaveBeenCalled();
  });

  it('proceeds telegram-only when desktop is enabled but alerter is missing', async () => {
    mocks.loadConfig.mockReturnValue({ ...enabledConfig, desktopNotifications: { enabled: true, timeoutSeconds: 10 } });
    mocks.createDesktopNotifier.mockReturnValue(null);
    mocks.listSubscriptions.mockReturnValue([makeSub()]);
    mocks.searchRecent.mockResolvedValue([makeStory({ id: 5 })]);

    const code = await runWatch({ dryRun: false });

    expect(code).toBe(0);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.markSeen).toHaveBeenCalledWith(5, 1, expect.any(Number));
  });

  it('sends to both channels when telegram and desktop are enabled', async () => {
    mocks.loadConfig.mockReturnValue({ ...enabledConfig, desktopNotifications: { enabled: true, timeoutSeconds: 10 } });
    mocks.listSubscriptions.mockReturnValue([makeSub()]);
    mocks.searchRecent.mockResolvedValue([makeStory({ id: 5 })]);

    await runWatch({ dryRun: false });

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.desktopSend).toHaveBeenCalledTimes(1);
  });

  it('exits 0 with no subscriptions', async () => {
    mocks.listSubscriptions.mockReturnValue([]);
    const code = await runWatch({ dryRun: false });
    expect(code).toBe(0);
    expect(mocks.searchRecent).not.toHaveBeenCalled();
  });

  it('notifies new matches, marks them seen, and touches lastRunAt', async () => {
    const sub = makeSub();
    mocks.listSubscriptions.mockReturnValue([sub]);
    mocks.searchRecent.mockResolvedValue([makeStory({ id: 42 })]);

    const code = await runWatch({ dryRun: false });

    expect(code).toBe(0);
    expect(mocks.send).toHaveBeenCalledWith({ subscriptions: [sub], story: expect.objectContaining({ id: 42 }) });
    expect(mocks.markSeen).toHaveBeenCalledWith(42, 1, expect.any(Number));
    expect(mocks.touchLastRun).toHaveBeenCalledWith(1, expect.any(Number));
  });

  it('filters out stories already in seen_items', async () => {
    mocks.listSubscriptions.mockReturnValue([makeSub()]);
    mocks.searchRecent.mockResolvedValue([makeStory({ id: 1 }), makeStory({ id: 2 })]);
    mocks.isSeen.mockImplementation((id: number) => id === 1);

    await runWatch({ dryRun: false });

    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ story: expect.objectContaining({ id: 2 }) }));
  });

  it('does not markSeen or send when --dry-run, but still logs would-notify', async () => {
    mocks.listSubscriptions.mockReturnValue([makeSub()]);
    mocks.searchRecent.mockResolvedValue([makeStory({ id: 1 })]);

    const code = await runWatch({ dryRun: true });

    expect(code).toBe(0);
    expect(mocks.send).not.toHaveBeenCalled();
    expect(mocks.markSeen).not.toHaveBeenCalled();
    expect(mocks.touchLastRun).not.toHaveBeenCalled();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('would notify: [postgres] Postgres 18 (100 pts)'));
  });

  it('does not touchLastRun and exits 1 when the Algolia query fails', async () => {
    mocks.listSubscriptions.mockReturnValue([makeSub()]);
    mocks.searchRecent.mockRejectedValue(new Error('network down'));

    const code = await runWatch({ dryRun: false });

    expect(code).toBe(1);
    expect(mocks.touchLastRun).not.toHaveBeenCalled();
  });

  it('does not markSeen but still touchLastRun when a send fails, and exits 1', async () => {
    mocks.listSubscriptions.mockReturnValue([makeSub()]);
    mocks.searchRecent.mockResolvedValue([makeStory({ id: 1 })]);
    mocks.send.mockRejectedValue(new Error('telegram down'));

    const code = await runWatch({ dryRun: false });

    expect(code).toBe(1);
    expect(mocks.markSeen).not.toHaveBeenCalled();
    expect(mocks.touchLastRun).toHaveBeenCalledWith(1, expect.any(Number));
  });

  it('processes subscriptions independently — one failure does not block another', async () => {
    const subA = makeSub({ id: 1, name: 'a' });
    const subB = makeSub({ id: 2, name: 'b' });
    mocks.listSubscriptions.mockReturnValue([subA, subB]);
    mocks.searchRecent.mockRejectedValueOnce(new Error('fails for a')).mockResolvedValueOnce([makeStory({ id: 9 })]);

    const code = await runWatch({ dryRun: false });

    expect(code).toBe(1);
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({ subscriptions: [subB] }));
    expect(mocks.touchLastRun).toHaveBeenCalledWith(2, expect.any(Number));
    expect(mocks.touchLastRun).not.toHaveBeenCalledWith(1, expect.any(Number));
  });

  it('windows the first run at now-24h and later runs at lastRunAt-6h', async () => {
    const now = Math.floor(Date.now() / 1000);
    mocks.listSubscriptions.mockReturnValue([makeSub({ lastRunAt: now - 1000 })]);
    mocks.searchRecent.mockResolvedValue([]);

    await runWatch({ dryRun: false });

    const createdAfter = mocks.searchRecent.mock.calls[0]![1].createdAfter;
    expect(createdAfter).toBeCloseTo(now - 1000 - 6 * 60 * 60, -1);
  });

  it('merges a story matched by multiple subscriptions into one notification', async () => {
    const subA = makeSub({ id: 1, name: 'a' });
    const subB = makeSub({ id: 2, name: 'b' });
    mocks.listSubscriptions.mockReturnValue([subA, subB]);
    const shared = makeStory({ id: 9 });
    mocks.searchRecent.mockResolvedValueOnce([shared]).mockResolvedValueOnce([shared]);

    const code = await runWatch({ dryRun: false });

    expect(code).toBe(0);
    expect(mocks.send).toHaveBeenCalledTimes(1);
    expect(mocks.send).toHaveBeenCalledWith({ subscriptions: [subA, subB], story: expect.objectContaining({ id: 9 }) });
    expect(mocks.markSeen).toHaveBeenCalledWith(9, 1, expect.any(Number));
    expect(mocks.markSeen).toHaveBeenCalledWith(9, 2, expect.any(Number));
    expect(mocks.touchLastRun).toHaveBeenCalledWith(1, expect.any(Number));
    expect(mocks.touchLastRun).toHaveBeenCalledWith(2, expect.any(Number));
  });

  it('marks neither sub seen when the merged notify fails, but still touches both lastRunAt', async () => {
    const subA = makeSub({ id: 1, name: 'a' });
    const subB = makeSub({ id: 2, name: 'b' });
    mocks.listSubscriptions.mockReturnValue([subA, subB]);
    const shared = makeStory({ id: 9 });
    mocks.searchRecent.mockResolvedValueOnce([shared]).mockResolvedValueOnce([shared]);
    mocks.send.mockRejectedValue(new Error('telegram down'));

    const code = await runWatch({ dryRun: false });

    expect(code).toBe(1);
    expect(mocks.markSeen).not.toHaveBeenCalled();
    expect(mocks.touchLastRun).toHaveBeenCalledWith(1, expect.any(Number));
    expect(mocks.touchLastRun).toHaveBeenCalledWith(2, expect.any(Number));
  });

  it('dispatches merged stories oldest-first by story.time', async () => {
    const subA = makeSub({ id: 1, name: 'a' });
    const subB = makeSub({ id: 2, name: 'b' });
    mocks.listSubscriptions.mockReturnValue([subA, subB]);
    const newer = makeStory({ id: 1, time: 2000 });
    const older = makeStory({ id: 2, time: 1000 });
    mocks.searchRecent.mockResolvedValueOnce([newer]).mockResolvedValueOnce([older]);

    await runWatch({ dryRun: false });

    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.send.mock.calls[0]![0].story.id).toBe(2);
    expect(mocks.send.mock.calls[1]![0].story.id).toBe(1);
  });
});
