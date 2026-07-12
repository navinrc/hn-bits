import { spawn } from 'node:child_process';
import { accessSync, constants } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, join } from 'node:path';
import { hnItemUrl } from '../api/firebase.js';
import type { Match, Notifier } from './notifier.js';

// Story data reaches the shell only as positional parameters, never spliced
// into the script, so titles containing quotes or $() cannot inject.
// $7 is the absolute alerter path: under cron the child PATH lacks it too.
const WRAPPER_SCRIPT =
  'r=$("$7" --title "$1" --subtitle "$2" --message "$3" --actions Open --timeout "$4" --group "$5"); ' +
  'case "$r" in @TIMEOUT|@CLOSED) ;; *) open "$6" ;; esac';

// Cron runs with PATH=/usr/bin:/bin, which contains neither the Homebrew
// prefix nor ~/.local/bin, so PATH alone would never find alerter under cron.
const FALLBACK_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', join(homedir(), '.local', 'bin')];

export function findAlerter(): string | null {
  const pathDirs = (process.env.PATH ?? '').split(delimiter);
  for (const dir of [...pathDirs, ...FALLBACK_DIRS]) {
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

function wrapperArguments({ subscription, story }: Match, timeoutSeconds: number, alerterPath: string): string[] {
  return [
    'sh',
    `🔔 ${subscription.name}`,
    `${story.score} pts · ${story.descendants} comments`,
    story.title,
    String(timeoutSeconds),
    `hn-${subscription.id}`,
    story.url ?? hnItemUrl(story.id),
    alerterPath,
  ];
}

/** Returns null (after one stderr warning) when alerter is not on PATH. */
export function createDesktopNotifier(config: { timeoutSeconds: number }): Notifier | null {
  const alerterPath = findAlerter();
  if (alerterPath == null) {
    console.error('desktop: alerter not found (brew install vjeantet/tap/alerter), skipping');
    return null;
  }
  return {
    name: 'desktop',
    // Fire-and-forget: the detached wrapper waits out the notification;
    // failures log but never reject, so the watcher's markSeen is not blocked.
    send: async (match) => {
      const child = spawn('sh', ['-c', WRAPPER_SCRIPT, ...wrapperArguments(match, config.timeoutSeconds, alerterPath)], {
        detached: true,
        stdio: 'ignore',
      });
      child.on('error', (err) => console.error(`desktop: spawn failed - ${err.message}`));
      child.unref();
    },
  };
}
