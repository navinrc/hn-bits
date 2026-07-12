import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story } from '../api/firebase.js';
import type { Subscription } from '../db/subscriptions.js';
import type { Match } from './notifier.js';

const mocks = vi.hoisted(() => ({
  spawn: vi.fn(),
  accessSync: vi.fn(),
}));

vi.mock('node:child_process', () => ({ spawn: mocks.spawn }));
vi.mock('node:fs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('node:fs')>()),
  accessSync: mocks.accessSync,
}));

const { createDesktopNotifier, findAlerter } = await import('./desktop.js');

const subscription: Subscription = {
  id: 7,
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

const match: Match = { subscription, story };

function fakeChild(): EventEmitter & { unref: () => void } {
  return Object.assign(new EventEmitter(), { unref: vi.fn() });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.accessSync.mockReturnValue(undefined);
  mocks.spawn.mockReturnValue(fakeChild());
});

describe('findAlerter', () => {
  it('returns the first executable PATH candidate', () => {
    mocks.accessSync.mockImplementationOnce(() => {
      throw new Error('ENOENT');
    });
    expect(findAlerter()).toMatch(/\/alerter$/);
    expect(mocks.accessSync).toHaveBeenCalledTimes(2);
  });

  it('returns null when no PATH entry has alerter', () => {
    mocks.accessSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(findAlerter()).toBeNull();
  });
});

describe('createDesktopNotifier', () => {
  it('returns null and warns once when alerter is missing', () => {
    mocks.accessSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(createDesktopNotifier({ timeoutSeconds: 10 })).toBeNull();
    expect(console.error).toHaveBeenCalledWith(
      'desktop: alerter not found (brew install vjeantet/tap/alerter), skipping',
    );
  });

  it('spawns a detached sh wrapper with story data as positional parameters only', async () => {
    const hostile = { ...story, title: 'evil "$(rm -rf ~)" title' };
    await createDesktopNotifier({ timeoutSeconds: 15 })!.send({ subscription, story: hostile });

    const [command, args, options] = mocks.spawn.mock.calls[0]!;
    expect(command).toBe('sh');
    expect(args[0]).toBe('-c');
    expect(args[1]).not.toContain('evil');
    expect(args.slice(2)).toEqual([
      'sh',
      '🔔 postgres',
      '312 pts · 214 comments',
      'evil "$(rm -rf ~)" title',
      '15',
      'hn-7',
      'https://example.com/article',
    ]);
    expect(options).toEqual({ detached: true, stdio: 'ignore' });
  });

  it('opens the HN discussion link for text posts', async () => {
    await createDesktopNotifier({ timeoutSeconds: 10 })!.send({ subscription, story: { ...story, url: undefined } });
    const args = mocks.spawn.mock.calls[0]![1] as string[];
    expect(args.at(-1)).toBe('https://news.ycombinator.com/item?id=41211001');
  });

  it('resolves immediately and unrefs without waiting for the wrapper', async () => {
    const child = fakeChild();
    mocks.spawn.mockReturnValue(child);
    await createDesktopNotifier({ timeoutSeconds: 10 })!.send(match);
    expect(child.unref).toHaveBeenCalled();
  });

  it('logs a spawn error instead of rejecting', async () => {
    const child = fakeChild();
    mocks.spawn.mockReturnValue(child);
    await createDesktopNotifier({ timeoutSeconds: 10 })!.send(match);
    child.emit('error', new Error('EACCES'));
    expect(console.error).toHaveBeenCalledWith('desktop: spawn failed - EACCES');
  });
});
