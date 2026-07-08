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
});
