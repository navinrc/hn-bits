import { describe, expect, it, vi } from 'vitest';
import { render } from '../test/inkHarness.js';
import { App } from './App.js';

vi.mock('../api/firebase.js', () => ({
  fetchStoryIds: vi.fn(() => new Promise(() => {})),
  fetchStories: vi.fn(() => new Promise(() => {})),
}));

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
});
