import { describe, expect, it, vi } from 'vitest';
import { addSubscription } from '../db/subscriptions.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { App } from './App.js';

useTempDb('hn-bits-app-');

vi.mock('../api/firebase.js', () => ({
  fetchStoryIds: vi.fn(() => new Promise(() => {})),
  fetchStories: vi.fn(() => new Promise(() => {})),
}));

vi.mock('../api/algolia.js', () => ({ searchRecent: vi.fn(() => Promise.resolve([])) }));

describe('App', () => {
  it('does not quit on q while the search input is focused', async () => {
    const instance = render(<App />, 80, 24);
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('/');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('/');

    instance.stdin.writeInput('q');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('/ q');

    instance.unmount();
  });

  it('shows the help overlay on ? and dismisses on any key', async () => {
    const instance = render(<App />, 80, 24);
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('?');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('story list');
    expect(instance.lastFrame()).toContain('global');

    instance.stdin.writeInput('x');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).not.toContain('story list');

    instance.unmount();
  });

  it('suppresses ? while the search input is focused', async () => {
    const instance = render(<App />, 80, 24);
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('/');
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('?');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('/ ?');

    instance.unmount();
  });

  it('keeps Subs highlighted (not the stale feed) when browsing a subscription\'s matches', async () => {
    addSubscription('postgres', 'postgres', 0);
    const instance = render(<App initialView="subs" />, 80, 24);
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('sub: postgres');
    expect(frame).toContain('│ Subs │');
    expect(frame).not.toContain('│ Top │');

    instance.unmount();
  });
});
