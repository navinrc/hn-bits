import { describe, expect, it, vi } from 'vitest';
import { addSubscription, listSubscriptions } from '../db/subscriptions.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { SubscriptionsView } from './SubscriptionsView.js';

useTempDb('hn-bits-subsview-');

function renderView() {
  const onSelectMatches = vi.fn();
  const onAdd = vi.fn();
  const onEdit = vi.fn();
  const onFeedChange = vi.fn();
  const onTabChange = vi.fn();
  const instance = render(
    <SubscriptionsView
      onSelectMatches={onSelectMatches}
      onAdd={onAdd}
      onEdit={onEdit}
      onFeedChange={onFeedChange}
      onTabChange={onTabChange}
    />,
    80,
    14,
  );
  return { instance, onSelectMatches, onAdd, onEdit, onFeedChange, onTabChange };
}

describe('SubscriptionsView', () => {
  it('shows the empty state when there are no subscriptions', async () => {
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('no subscriptions yet');
    instance.unmount();
  });

  it('lists subscriptions with name, query, points, and age', async () => {
    addSubscription('postgres', 'postgres', 50);
    addSubscription('zig-lang', 'zig', 0);
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();

    const frame = instance.lastFrame();
    expect(frame).toContain('postgres');
    expect(frame).toContain('"postgres"');
    expect(frame).toContain('≥50 pts');
    expect(frame).toContain('zig-lang');
    expect(frame).toContain('any');
    instance.unmount();
  });

  it('opens matches for the selected subscription on enter', async () => {
    addSubscription('postgres', 'postgres', 0);
    const { instance, onSelectMatches } = renderView();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSelectMatches).toHaveBeenCalledWith(expect.objectContaining({ name: 'postgres' }));
    instance.unmount();
  });

  it('calls onAdd on a and onEdit on e', async () => {
    addSubscription('postgres', 'postgres', 0);
    const { instance, onAdd, onEdit } = renderView();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('a');
    await instance.waitUntilRenderFlush();
    expect(onAdd).toHaveBeenCalled();

    instance.stdin.writeInput('e');
    await instance.waitUntilRenderFlush();
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ name: 'postgres' }));
    instance.unmount();
  });

  it('deletes the selected subscription after confirming with y', async () => {
    addSubscription('postgres', 'postgres', 0);
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('d');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain("delete 'postgres'? y/n");

    instance.stdin.writeInput('y');
    await instance.waitUntilRenderFlush();

    expect(listSubscriptions()).toEqual([]);
    expect(instance.lastFrame()).toContain('no subscriptions yet');
    instance.unmount();
  });

  it('cancels delete on n, leaving the subscription intact', async () => {
    addSubscription('postgres', 'postgres', 0);
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('d');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('n');
    await instance.waitUntilRenderFlush();

    expect(listSubscriptions()).toHaveLength(1);
    expect(instance.lastFrame()).not.toContain('delete');
    instance.unmount();
  });
});
