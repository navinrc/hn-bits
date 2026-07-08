import { Text } from 'ink';
import { describe, expect, it } from 'vitest';
import { render } from './inkHarness.js';

describe('inkHarness', () => {
  it('renders a frame and strips ANSI escapes', async () => {
    const instance = render(<Text color="red">hello</Text>, 80, 24);
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('hello');
    expect(instance.lastFrame()).not.toMatch(/\[/);

    instance.unmount();
  });

  it('rerenders with updated props', async () => {
    const instance = render(<Text>first</Text>, 80, 24);
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('first');

    instance.rerender(<Text>second</Text>);
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('second');

    instance.unmount();
  });
});
