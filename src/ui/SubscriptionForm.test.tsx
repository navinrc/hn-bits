import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Story } from '../api/firebase.js';
import { addSubscription, listSubscriptions } from '../db/subscriptions.js';
import { useTempDb } from '../test/dbHarness.js';
import { render } from '../test/inkHarness.js';
import { SubscriptionForm } from './SubscriptionForm.js';

useTempDb('hn-bits-subform-');

function makeStory(id: number): Story {
  return { id, title: `Tokio ${id}`, url: `https://example.com/${id}`, by: 'alice', score: 100 + id, descendants: 0, time: 0 };
}

const mocks = vi.hoisted(() => ({
  searchRecent: vi.fn(),
  hasScheduledJob: vi.fn(),
  installScheduledJob: vi.fn(),
}));
vi.mock('../api/algolia.js', () => ({ searchRecent: mocks.searchRecent }));
vi.mock('../lib/schedule.js', () => ({
  hasScheduledJob: mocks.hasScheduledJob,
  installScheduledJob: mocks.installScheduledJob,
}));
const { searchRecent } = mocks;

const TAB = '\t';

beforeEach(() => {
  vi.clearAllMocks();
  searchRecent.mockResolvedValue([]);
  mocks.hasScheduledJob.mockReturnValue(true); // most tests don't care about the schedule prompt
});

afterEach(() => {
  vi.useRealTimers();
});

function renderForm(props: Partial<Parameters<typeof SubscriptionForm>[0]> = {}) {
  const onSave = vi.fn();
  const onCancel = vi.fn();
  const instance = render(
    <SubscriptionForm mode="add" onSave={onSave} onCancel={onCancel} {...props} />,
    80,
    20,
  );
  return { instance, onSave, onCancel };
}

describe('SubscriptionForm', () => {
  it('shows "New subscription" in add mode', async () => {
    const { instance } = renderForm();
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('New subscription');
    instance.unmount();
  });

  it('shows "Edit subscription" pre-filled in edit mode', async () => {
    const { instance } = renderForm({
      mode: 'edit',
      subscription: { id: 1, name: 'postgres', query: 'postgres', minPoints: 50, createdAt: 0, lastRunAt: null },
    });
    await instance.waitUntilRenderFlush();
    const frame = instance.lastFrame();
    expect(frame).toContain('Edit subscription');
    expect(frame).toContain('postgres');
    expect(frame).toContain('50');
    instance.unmount();
  });

  it('types into name, then tab cycles to query and min points', async () => {
    const { instance } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('rust');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('name:        rust');

    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('async');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('query:       async');

    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('50');
    await instance.waitUntilRenderFlush();
    expect(instance.lastFrame()).toContain('min points:  50');

    instance.unmount();
  });

  it('ignores non-digit input in the min points field', async () => {
    const { instance } = renderForm();
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();

    // Sent one byte at a time: a real terminal delivers keystrokes individually,
    // unlike a bulk multi-char write (which Ink treats as a paste-like unit).
    for (const char of 'abc5') {
      instance.stdin.writeInput(char);
      await instance.waitUntilRenderFlush();
    }

    expect(instance.lastFrame()).toContain('min points:  5');
    instance.unmount();
  });

  it('shows a debounced live preview after typing a query', async () => {
    searchRecent.mockResolvedValue([makeStory(1)]);
    const { instance } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('rust');
    await instance.waitUntilRenderFlush();

    expect(searchRecent).not.toHaveBeenCalled();
    await new Promise((resolve) => setTimeout(resolve, 400));
    await instance.waitUntilRenderFlush();

    expect(searchRecent).toHaveBeenCalledWith('rust', expect.objectContaining({ minPoints: 0 }));
    expect(instance.lastFrame()).toContain('Tokio 1');
    instance.unmount();
  });

  it('saves a valid subscription and calls onSave', async () => {
    const { instance, onSave } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('rust-async');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('rust async');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSave).toHaveBeenCalled();
    expect(listSubscriptions()).toEqual([
      expect.objectContaining({ name: 'rust-async', query: 'rust async', minPoints: 0 }),
    ]);
    instance.unmount();
  });

  it('shows an inline error and does not save when name is empty', async () => {
    const { instance, onSave } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('rust');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSave).not.toHaveBeenCalled();
    expect(instance.lastFrame()).toContain('name is required');
    instance.unmount();
  });

  it('saves a topic-less subscription when a threshold is set', async () => {
    const { instance, onSave } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('hot');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('250');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSave).toHaveBeenCalled();
    expect(listSubscriptions()).toEqual([expect.objectContaining({ name: 'hot', query: '', minPoints: 250 })]);
    instance.unmount();
  });

  it('shows an inline error when both query and thresholds are empty', async () => {
    const { instance, onSave } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('hot');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSave).not.toHaveBeenCalled();
    expect(instance.lastFrame()).toContain('query or a threshold is required');
    instance.unmount();
  });

  it('shows a live preview for an empty query once a threshold is set', async () => {
    searchRecent.mockResolvedValue([makeStory(2)]);
    const { instance } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('250');
    await instance.waitUntilRenderFlush();

    await new Promise((resolve) => setTimeout(resolve, 400));
    await instance.waitUntilRenderFlush();

    expect(searchRecent).toHaveBeenCalledWith('', expect.objectContaining({ minPoints: 250 }));
    expect(instance.lastFrame()).toContain('Tokio 2');
    instance.unmount();
  });

  it('shows a duplicate-name error from addSubscription', async () => {
    addSubscription('postgres', 'postgres', 0);
    const { instance, onSave } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('postgres');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('zig');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSave).not.toHaveBeenCalled();
    expect(instance.lastFrame()).toContain("subscription 'postgres' already exists");
    instance.unmount();
  });

  it('prompts to install a schedule after the first subscription when none is installed', async () => {
    mocks.hasScheduledJob.mockReturnValue(false);
    const { instance, onSave } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('rust-async');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('rust async');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSave).not.toHaveBeenCalled();
    expect(instance.lastFrame()).toContain('install one now');

    instance.stdin.writeInput('y');
    await instance.waitUntilRenderFlush();

    expect(mocks.installScheduledJob).toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
    instance.unmount();
  });

  it('skips installing when the user answers n to the schedule prompt', async () => {
    mocks.hasScheduledJob.mockReturnValue(false);
    const { instance, onSave } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('rust-async');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('rust async');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('n');
    await instance.waitUntilRenderFlush();

    expect(mocks.installScheduledJob).not.toHaveBeenCalled();
    expect(onSave).toHaveBeenCalled();
    instance.unmount();
  });

  it('does not prompt when a schedule is already installed', async () => {
    mocks.hasScheduledJob.mockReturnValue(true);
    const { instance, onSave } = renderForm();
    await instance.waitUntilRenderFlush();

    instance.stdin.writeInput('rust-async');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput(TAB);
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('rust async');
    await instance.waitUntilRenderFlush();
    instance.stdin.writeInput('\r');
    await instance.waitUntilRenderFlush();

    expect(onSave).toHaveBeenCalled();
    expect(instance.lastFrame()).not.toContain('install one now');
    instance.unmount();
  });

  it('calls onCancel on esc', async () => {
    const { instance, onCancel } = renderForm();
    await instance.waitUntilRenderFlush();

    // A lone ESC byte is buffered as a "pending" escape sequence (it might be the
    // start of an arrow-key CSI code) until Ink's 20ms flush timer fires.
    instance.stdin.writeInput('\x1b');
    await new Promise((resolve) => setTimeout(resolve, 30));
    await instance.waitUntilRenderFlush();

    expect(onCancel).toHaveBeenCalled();
    instance.unmount();
  });
});
