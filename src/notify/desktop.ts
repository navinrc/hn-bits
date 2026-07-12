import { spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { delimiter, join } from 'node:path';
import { hnItemUrl } from '../api/firebase.js';
import type { Match, Notifier } from './notifier.js';

// Story data reaches the shell only as positional parameters, never spliced
// into the script, so titles containing quotes or $() cannot inject.
const WRAPPER_SCRIPT =
  'r=$(alerter -title "$1" -subtitle "$2" -message "$3" -actions Open -timeout "$4" -group "$5"); ' +
  'case "$r" in @TIMEOUT|@CLOSED) ;; *) open "$6" ;; esac';

export function findAlerter(): string | null {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, 'alerter');
    try {
      accessSync(candidate, constants.X_OK);
      return candidate;
    } catch {
      // not here, keep scanning
    }
  }
  return null;
}

function wrapperArguments({ subscription, story }: Match, timeoutSeconds: number): string[] {
  return [
    'sh',
    `🔔 ${subscription.name}`,
    `${story.score} pts · ${story.descendants} comments`,
    story.title,
    String(timeoutSeconds),
    `hn-${subscription.id}`,
    story.url ?? hnItemUrl(story.id),
  ];
}

/** Returns null (after one stderr warning) when alerter is not on PATH. */
export function createDesktopNotifier(config: { timeoutSeconds: number }): Notifier | null {
  if (findAlerter() == null) {
    console.error('desktop: alerter not found (brew install vjeantet/tap/alerter), skipping');
    return null;
  }
  return {
    name: 'desktop',
    // Fire-and-forget: the detached wrapper waits out the notification;
    // failures log but never reject, so the watcher's markSeen is not blocked.
    send: async (match) => {
      const child = spawn('sh', ['-c', WRAPPER_SCRIPT, ...wrapperArguments(match, config.timeoutSeconds)], {
        detached: true,
        stdio: 'ignore',
      });
      child.on('error', (err) => console.error(`desktop: spawn failed - ${err.message}`));
      child.unref();
    },
  };
}
