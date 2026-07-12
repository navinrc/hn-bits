import { searchRecent } from './api/algolia.js';
import type { Story } from './api/firebase.js';
import { isSeen, markSeen } from './db/seen.js';
import { listSubscriptions, touchLastRun, type Subscription } from './db/subscriptions.js';
import { loadConfig } from './lib/config.js';
import { createDesktopNotifier } from './notify/desktop.js';
import type { Notifier } from './notify/notifier.js';
import { createTelegramNotifier } from './notify/telegram.js';

const SIX_HOURS = 6 * 60 * 60;
const TWENTY_FOUR_HOURS = 24 * 60 * 60;

export interface WatchOptions {
  dryRun: boolean;
}

function log(message: string): void {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

function windowStart(lastRunAt: number | null, now: number): number {
  if (lastRunAt == null) return now - TWENTY_FOUR_HOURS;
  return Math.max(lastRunAt - SIX_HOURS, 0);
}

interface BuiltNotifiers {
  notifiers: Notifier[];
  /** Desktop was enabled but alerter is missing: warned, run must exit 0 untouched. */
  desktopSkipped: boolean;
}

function buildNotifiers(): BuiltNotifiers {
  const config = loadConfig();
  const notifiers: Notifier[] = [];
  let desktopSkipped = false;

  const telegram = config?.telegram;
  if (telegram?.enabled && telegram.botToken && telegram.chatId) {
    notifiers.push(createTelegramNotifier({ botToken: telegram.botToken, chatId: telegram.chatId }));
  }

  const desktop = config?.desktopNotifications;
  if (desktop?.enabled) {
    const notifier = createDesktopNotifier({ timeoutSeconds: desktop.timeoutSeconds });
    if (notifier) notifiers.push(notifier);
    else desktopSkipped = true;
  }

  return { notifiers, desktopSkipped };
}

/** Query plus unseen filter for one subscription. null on query failure. */
async function fetchMatches(sub: Subscription, now: number): Promise<Story[] | null> {
  try {
    const stories = await searchRecent(sub.query, {
      createdAfter: windowStart(sub.lastRunAt, now),
      minPoints: sub.minPoints,
      minComments: sub.minComments,
    });
    return stories.filter((story) => !isSeen(story.id, sub.id));
  } catch (err) {
    log(`${sub.name}: query failed - ${(err as Error).message}`);
    return null;
  }
}

interface PendingMatch {
  story: Story;
  subscriptions: Subscription[];
}

interface CollectResult {
  pending: Map<number, PendingMatch>;
  fetchedSubs: Subscription[];
  failedSubs: number;
}

/** Phase A: fetch every subscription, merging stories matched by more than one. */
async function collectPending(subs: Subscription[], now: number): Promise<CollectResult> {
  const pending = new Map<number, PendingMatch>();
  const fetchedSubs: Subscription[] = [];
  let failedSubs = 0;

  for (const sub of subs) {
    const matches = await fetchMatches(sub, now);
    if (matches === null) {
      failedSubs++;
      continue;
    }
    fetchedSubs.push(sub);
    for (const story of matches) {
      const entry = pending.get(story.id);
      if (entry) entry.subscriptions.push(sub);
      else pending.set(story.id, { story, subscriptions: [sub] });
    }
  }

  return { pending, fetchedSubs, failedSubs };
}

async function notifyStory(subscriptions: Subscription[], story: Story, notifiers: Notifier[]): Promise<boolean> {
  const names = subscriptions.map((s) => s.name).join(', ');
  try {
    for (const notifier of notifiers) await notifier.send({ subscriptions, story });
    return true;
  } catch (err) {
    log(`${names}: notify failed for ${story.id} - ${(err as Error).message}`);
    return false;
  }
}

interface DispatchResult {
  totalNotified: number;
  hadFailure: boolean;
}

/** Phase B: one notify per story, oldest first. */
async function dispatchPending(pending: Map<number, PendingMatch>, notifiers: Notifier[], now: number, dryRun: boolean): Promise<DispatchResult> {
  const ordered = [...pending.values()].sort((a, b) => a.story.time - b.story.time);
  let totalNotified = 0;
  let hadFailure = false;

  for (const { story, subscriptions } of ordered) {
    const names = subscriptions.map((s) => s.name).join(', ');
    if (dryRun) {
      log(`would notify: [${names}] ${story.title} (${story.score} pts)`);
      continue;
    }
    const sent = await notifyStory(subscriptions, story, notifiers);
    if (!sent) {
      hadFailure = true;
      continue;
    }
    for (const sub of subscriptions) markSeen(story.id, sub.id, now);
    log(`${names}: notified ${story.id} "${story.title}" (${story.score} pts)`);
    totalNotified++;
  }

  return { totalNotified, hadFailure };
}

/** hn watch --once: one-shot pass over all subscriptions. Returns the process exit code. */
export async function runWatch(options: WatchOptions): Promise<number> {
  const { notifiers, desktopSkipped } = buildNotifiers();
  if (notifiers.length === 0) {
    if (desktopSkipped) return 0;
    console.error(
      'no notifier configured: hn config set telegram.enabled true (and botToken/chatId) or desktopNotifications.enabled true',
    );
    return 2;
  }

  const subs = listSubscriptions();
  if (subs.length === 0) {
    log('no subscriptions');
    return 0;
  }

  log(`watch: ${subs.length} subscriptions`);
  const now = Math.floor(Date.now() / 1000);

  const { pending, fetchedSubs, failedSubs } = await collectPending(subs, now);
  if (pending.size === 0) log('no new matches');
  const { totalNotified, hadFailure } = await dispatchPending(pending, notifiers, now, options.dryRun);

  if (!options.dryRun) for (const sub of fetchedSubs) touchLastRun(sub.id, now);

  log(`done: ${totalNotified} notified, ${failedSubs} failed`);
  return failedSubs > 0 || hadFailure ? 1 : 0;
}
