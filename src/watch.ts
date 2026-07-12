import { searchRecent } from './api/algolia.js';
import type { Story } from './api/firebase.js';
import { isSeen, markSeen } from './db/seen.js';
import { listSubscriptions, touchLastRun, type Subscription } from './db/subscriptions.js';
import { loadConfig } from './lib/config.js';
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

function buildNotifiers(): Notifier[] {
  const config = loadConfig();
  const telegram = config?.telegram;
  if (telegram?.enabled && telegram.botToken && telegram.chatId) {
    return [createTelegramNotifier({ botToken: telegram.botToken, chatId: telegram.chatId })];
  }
  return [];
}

async function notifyStory(sub: Subscription, story: Story, notifiers: Notifier[]): Promise<boolean> {
  try {
    for (const notifier of notifiers) await notifier.send({ subscription: sub, story });
    return true;
  } catch (err) {
    log(`${sub.name}: notify failed for ${story.id} - ${(err as Error).message}`);
    return false;
  }
}

interface SubscriptionResult {
  notified: number;
  hadFailure: boolean;
}

async function processSubscription(
  sub: Subscription,
  notifiers: Notifier[],
  now: number,
  dryRun: boolean,
): Promise<SubscriptionResult> {
  let stories: Story[];
  try {
    stories = await searchRecent(sub.query, { createdAfter: windowStart(sub.lastRunAt, now), minPoints: sub.minPoints });
  } catch (err) {
    log(`${sub.name}: query failed - ${(err as Error).message}`);
    return { notified: 0, hadFailure: true };
  }

  const matches = stories.filter((story) => !isSeen(story.id, sub.id)).sort((a, b) => a.time - b.time);
  if (matches.length === 0) {
    log(`${sub.name}: no new matches`);
    if (!dryRun) touchLastRun(sub.id, now);
    return { notified: 0, hadFailure: false };
  }

  log(`${sub.name}: ${matches.length} new matches`);
  let notified = 0;
  let hadFailure = false;
  for (const story of matches) {
    if (dryRun) {
      log(`would notify: [${sub.name}] ${story.title} (${story.score} pts)`);
      continue;
    }
    const sent = await notifyStory(sub, story, notifiers);
    if (!sent) {
      hadFailure = true;
      continue;
    }
    markSeen(story.id, sub.id, now);
    log(`${sub.name}: notified ${story.id} "${story.title}" (${story.score} pts)`);
    notified++;
  }
  if (!dryRun) touchLastRun(sub.id, now);
  return { notified, hadFailure };
}

/** hn watch --once: one-shot pass over all subscriptions. Returns the process exit code. */
export async function runWatch(options: WatchOptions): Promise<number> {
  const notifiers = buildNotifiers();
  if (notifiers.length === 0) {
    console.error('no notifier configured: hn config set telegram.enabled true (and botToken/chatId)');
    return 2;
  }

  const subs = listSubscriptions();
  if (subs.length === 0) {
    log('no subscriptions');
    return 0;
  }

  log(`watch: ${subs.length} subscriptions`);
  const now = Math.floor(Date.now() / 1000);
  let totalNotified = 0;
  let failedSubs = 0;

  for (const sub of subs) {
    const result = await processSubscription(sub, notifiers, now, options.dryRun);
    totalNotified += result.notified;
    if (result.hadFailure) failedSubs++;
  }

  log(`done: ${totalNotified} notified, ${failedSubs} failed`);
  return failedSubs > 0 ? 1 : 0;
}
