import { Text } from 'ink';
import type { JSX } from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '../test/inkHarness.js';
import { Body, Footer, Header, Screen } from './Layout.js';

function screen(): JSX.Element {
  return (
    <Screen>
      <Header>
        <Text>TITLE</Text>
      </Header>
      <Body>
        <Text>BODY</Text>
      </Body>
      <Footer>
        <Text>HINT</Text>
      </Footer>
    </Screen>
  );
}

describe('Layout', () => {
  it('renders header above body above footer', async () => {
    const instance = render(screen(), 40, 10);
    await instance.waitUntilRenderFlush();

    const lines = instance.lastFrame().split('\n');
    expect(lines.findIndex((line) => line.includes('TITLE'))).toBeLessThan(
      lines.findIndex((line) => line.includes('BODY')),
    );
    expect(lines.findIndex((line) => line.includes('BODY'))).toBeLessThan(
      lines.findIndex((line) => line.includes('HINT')),
    );

    instance.unmount();
  });

  it('re-renders on terminal resize', async () => {
    const instance = render(screen(), 40, 10);
    await instance.waitUntilRenderFlush();

    instance.stdout.emitResize(20, 6);
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('TITLE');

    instance.unmount();
  });

  it('shows a message instead of the layout when the terminal is too small', async () => {
    const instance = render(screen(), 40, 5);
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('too small');
    expect(instance.lastFrame()).not.toContain('TITLE');

    instance.unmount();
  });
});
