import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addSubscription, listSubscriptions } from '../db/subscriptions.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { SubscriptionsView } from './SubscriptionsView.js';

const mocks = vi.hoisted(() => ({
  hasScheduledJob: vi.fn(),
  installScheduledJob: vi.fn(),
  removeScheduledJob: vi.fn(),
}));
vi.mock('../lib/schedule.js', () => ({
  hasScheduledJob: mocks.hasScheduledJob,
  installScheduledJob: mocks.installScheduledJob,
  removeScheduledJob: mocks.removeScheduledJob,
}));

useTempDb('hn-bits-subsview-');

beforeEach(() => {
  vi.resetAllMocks();
  mocks.hasScheduledJob.mockReturnValue(true); // most tests don't care about the schedule line
});

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

  it('shows "schedule: not installed" when no cron job is installed', async () => {
    mocks.hasScheduledJob.mockReturnValue(false);
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('schedule: not installed');
    instance.unmount();
  });

  it('shows "schedule: installed (every 30 min)" when a cron job is installed', async () => {
    mocks.hasScheduledJob.mockReturnValue(true);
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('schedule: installed (every 30 min)');
    instance.unmount();
  });

  it('installs the schedule on c when not installed', async () => {
    mocks.hasScheduledJob.mockReturnValue(false);
    addSubscription('postgres', 'postgres', 0);
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('c');
    await instance.waitUntilRenderFlush();

    expect(mocks.installScheduledJob).toHaveBeenCalled();
    expect(instance.lastFrame()).toContain('schedule: installed (every 30 min)');
    instance.unmount();
  });

  it('removes the schedule on c when installed', async () => {
    mocks.hasScheduledJob.mockReturnValue(true);
    addSubscription('postgres', 'postgres', 0);
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('c');
    await instance.waitUntilRenderFlush();

    expect(mocks.removeScheduledJob).toHaveBeenCalled();
    expect(instance.lastFrame()).toContain('schedule: not installed');
    instance.unmount();
  });

  it("shows a failure message when hn isn't on PATH", async () => {
    mocks.hasScheduledJob.mockReturnValue(false);
    mocks.installScheduledJob.mockImplementation(() => {
      throw new Error('no hn');
    });
    addSubscription('postgres', 'postgres', 0);
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('c');
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain("couldn't find 'hn' on PATH");
    expect(instance.lastFrame()).toContain('schedule: not installed');
    instance.unmount();
  });

  it('shows and toggles the schedule status line in the empty-subscriptions state', async () => {
    mocks.hasScheduledJob.mockReturnValue(false);
    const { instance } = renderView();
    await instance.waitUntilRenderFlush();

    expect(instance.lastFrame()).toContain('no subscriptions yet');
    expect(instance.lastFrame()).toContain('schedule: not installed');

    instance.stdin.writeInput('c');
    await instance.waitUntilRenderFlush();

    expect(mocks.installScheduledJob).toHaveBeenCalled();
    expect(instance.lastFrame()).toContain('schedule: installed (every 30 min)');
    instance.unmount();
  });
});
