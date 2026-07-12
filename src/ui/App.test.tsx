import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { addSubscription } from '../db/subscriptions.js';
import { getConfigValue } from '../lib/configStore.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { App } from './App.js';

useTempDb('hn-bits-app-');

let configDir: string;

beforeEach(() => {
  configDir = mkdtempSync(join(tmpdir(), 'hn-bits-app-config-'));
  process.env.HN_BITS_CONFIG = join(configDir, 'config.json');
});

afterEach(() => {
  rmSync(configDir, { recursive: true, force: true });
  delete process.env.HN_BITS_CONFIG;
});

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

  it('opens the theme picker on T and cancels on escape without changing theme', async () => {
    const instance = render(<App />, 80, 24);
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('T');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('hn (current)');

    // A lone ESC byte is buffered as a "pending" escape sequence (it might be the
    // start of an arrow-key CSI code) until Ink's 20ms flush timer fires.
    instance.stdin.writeInput('\x1b');
    await new Promise((resolve) => setTimeout(resolve, 30));
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).not.toContain('(current)');
    expect(getConfigValue('ui.theme')).toBeUndefined();

    instance.unmount();
  });

  it('applies the picked theme live and persists it to config on enter', async () => {
    const instance = render(<App />, 80, 24);
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('T');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('j');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).not.toContain('(current)');
    expect(getConfigValue('ui.theme')).toBe('mocha');

    instance.stdin.writeInput('T');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('mocha (current)');

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
