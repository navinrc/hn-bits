import { describe, expect, it, vi } from 'vitest';
import { render } from '../test/inkHarness.js';
import { paletteNames } from './theme.js';
import { ThemePicker } from './ThemePicker.js';

function renderPicker(current = paletteNames()[0]!) {
  const onSelect = vi.fn();
  const onCancel = vi.fn();
  const instance = render(<ThemePicker current={current} onSelect={onSelect} onCancel={onCancel} />);
  return { instance, onSelect, onCancel };
}

describe('ThemePicker', () => {
  it('lists every palette name', async () => {
    const { instance } = renderPicker();
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    for (const name of paletteNames()) expect(frame).toContain(name);
    instance.unmount();
  });

  it('opens with the cursor on the current theme', async () => {
    const { instance } = renderPicker('dracula');
    await instance.waitUntilRenderFlush();

    const line = instance.lastFrame().split('\n').find((row) => row.includes('dracula'));
    expect(line).toContain('❯');
    instance.unmount();
  });

  it('moves the cursor with j/k', async () => {
    const names = paletteNames();
    const { instance } = renderPicker(names[0]!);
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('j');
    await instance.waitUntilRenderFlush();

    const line = instance.lastFrame().split('\n').find((row) => row.includes(names[1]!));
    expect(line).toContain('❯');
    instance.unmount();
  });

  it('selects the highlighted theme on enter', async () => {
    const names = paletteNames();
    const { instance, onSelect } = renderPicker(names[0]!);
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('j');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSelect).toHaveBeenCalledWith(names[1]);
    instance.unmount();
  });

  it('cancels without selecting on escape', async () => {
    const { instance, onSelect, onCancel } = renderPicker();
    await instance.waitUntilRenderFlush();

    // A lone ESC byte is buffered as a "pending" escape sequence (it might be the
    // start of an arrow-key CSI code) until Ink's 20ms flush timer fires.
    instance.stdin.writeInput('\x1b');
    await new Promise((resolve) => setTimeout(resolve, 30));
    await instance.waitUntilRenderFlush();

    expect(onCancel).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    instance.unmount();
  });
});
