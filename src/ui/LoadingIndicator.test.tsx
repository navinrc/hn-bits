import { describe, expect, it } from 'vitest';
import { render } from '../test/inkHarness.js';
import { LoadingIndicator } from './LoadingIndicator.js';

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

describe('LoadingIndicator', () => {
  it('renders the label with a spinner frame glyph', async () => {
    const instance = render(<LoadingIndicator label="Loading stories..." />);
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('Loading stories...');
    expect(SPINNER_FRAMES.some((glyph) => frame.startsWith(glyph))).toBe(true);
    instance.unmount();
  });

  it('stops its interval on unmount', async () => {
    const instance = render(<LoadingIndicator label="Searching..." />);
    await instance.waitUntilRenderFlush();
    instance.unmount();
  });
});
