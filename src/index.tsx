#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { render } from 'ink';

const alternateScreen = process.stdout.isTTY === true;

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8')) as {
  version: string;
};

interface GlobalOptions {
  theme?: string;
}

function applyTheme(options: GlobalOptions): void {
  if (options.theme) process.env['HN_THEME'] = options.theme;
}

const program = new Command();
program
  .name('hn')
  .description('Terminal-first Hacker News client')
  .version(packageJson.version)
  .option('-t, --theme <name>', 'color theme (see `hn theme` for the list)');

program.action(async () => {
  applyTheme(program.opts<GlobalOptions>());
  const { App } = await import('./ui/App.js');
  render(<App />, { alternateScreen });
});

program
  .command('search <query...>')
  .description('Search stories by keyword')
  .action(async (queryParts: string[]) => {
    applyTheme(program.opts<GlobalOptions>());
    const { App } = await import('./ui/App.js');
    render(<App initialQuery={queryParts.join(' ')} />, { alternateScreen });
  });

program
  .command('bookmarks')
  .description('Open the TUI on the Saved tab')
  .action(async () => {
    applyTheme(program.opts<GlobalOptions>());
    const { App } = await import('./ui/App.js');
    render(<App initialView="saved" />, { alternateScreen });
  });

program
  .command('subs')
  .description('Open the TUI on the Subs tab')
  .action(async () => {
    applyTheme(program.opts<GlobalOptions>());
    const { App } = await import('./ui/App.js');
    render(<App initialView="subs" />, { alternateScreen });
  });

program
  .command('theme')
  .description('Show the active color theme and available palettes')
  .action(async () => {
    const { paletteNames, resolvePaletteName, resolvePaletteSource } = await import('./ui/theme.js');
    const flag = program.opts<GlobalOptions>().theme;
    const activeName = resolvePaletteName(flag);
    const source = resolvePaletteSource(flag);
    const sourceLabel = source === 'default' ? '(default)' : `(from ${source})`;
    console.log(`Active theme: ${activeName} ${sourceLabel}`);
    console.log(
      `Available: ${paletteNames()
        .map((n) => (n === 'hn' ? `${n} (default)` : n))
        .join(', ')}`,
    );
    console.log(
      'Set with `hn --theme <name>`, the HN_THEME environment variable, or `hn config set ui.theme <name>`.',
    );
  });

const config = program.command('config').description('Get or set hn-bits config values');

config
  .command('list')
  .description('List all known config keys and their current values')
  .action(async () => {
    const { listConfigEntries } = await import('./lib/configStore.js');
    for (const { key, value } of listConfigEntries()) {
      console.log(`${key}=${value ?? '(not set)'}`);
    }
  });

config
  .command('get <key>')
  .description('Print a single config value')
  .action(async (key: string) => {
    const { getConfigValue } = await import('./lib/configStore.js');
    try {
      const value = getConfigValue(key);
      if (value === undefined) {
        console.error(`${key} is not set`);
        process.exit(1);
      }
      console.log(value);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

config
  .command('set <key> <value>')
  .description('Set a config value')
  .action(async (key: string, value: string) => {
    const { setConfigValue } = await import('./lib/configStore.js');
    try {
      setConfigValue(key, value);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

config
  .command('unset <key>')
  .description('Remove a config value')
  .action(async (key: string) => {
    const { unsetConfigValue } = await import('./lib/configStore.js');
    try {
      unsetConfigValue(key);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

const sub = program.command('sub').description('Manage topic subscriptions');

interface SubAddOptions {
  minPoints: string;
  minComments: string;
}

function parseNonNegativeInt(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    console.error(`${flag} must be a non-negative integer, got '${value}'`);
    process.exit(1);
  }
  return parsed;
}

async function promptInstallSchedule(): Promise<void> {
  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('No watch schedule installed yet. Install one now (every 30 min)? [y/N] ');
  rl.close();
  if (!/^y(es)?$/i.test(answer.trim())) {
    console.log("skipped. Run 'hn schedule install' anytime, or add the cron line yourself (see README).");
    return;
  }
  const { installScheduledJob } = await import('./lib/schedule.js');
  try {
    const line = installScheduledJob();
    console.log(`installed: ${line}`);
  } catch {
    console.log("couldn't find 'hn' on PATH — add the cron line yourself (see README) or run 'hn schedule install' later.");
  }
}

sub
  .command('add <name> <query...>')
  .description('Add a subscription')
  .option('--min-points <n>', 'minimum points threshold', '0')
  .option('--min-comments <n>', 'minimum comments threshold', '0')
  .action(async (name: string, queryParts: string[], options: SubAddOptions) => {
    const minPoints = parseNonNegativeInt(options.minPoints, '--min-points');
    const minComments = parseNonNegativeInt(options.minComments, '--min-comments');
    const { addSubscription, listSubscriptions } = await import('./db/subscriptions.js');
    try {
      addSubscription(name, queryParts.join(' '), minPoints, minComments);
      console.log(`added '${name}'`);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
    const { hasScheduledJob } = await import('./lib/schedule.js');
    if (listSubscriptions().length === 1 && !hasScheduledJob()) {
      await promptInstallSchedule();
    }
  });

sub
  .command('list')
  .description('List subscriptions')
  .action(async () => {
    const { listSubscriptions } = await import('./db/subscriptions.js');
    const { formatAge } = await import('./lib/format.js');
    const { thresholdLabel } = await import('./lib/subscriptionLabel.js');
    const subs = listSubscriptions();
    if (subs.length === 0) {
      console.log('no subscriptions yet');
      return;
    }
    const nameWidth = Math.max(...subs.map((s) => s.name.length));
    for (const s of subs) {
      const threshold = thresholdLabel(s.minPoints, s.minComments);
      const lastRun = s.lastRunAt == null ? 'never' : `${formatAge(s.lastRunAt)} ago`;
      console.log(`${s.name.padEnd(nameWidth)}  "${s.query}"  ${threshold}  ${lastRun}`);
    }
  });

sub
  .command('rm <name>')
  .description('Remove a subscription')
  .action(async (name: string) => {
    const { removeSubscription } = await import('./db/subscriptions.js');
    if (!removeSubscription(name)) {
      console.error(`subscription '${name}' not found`);
      process.exit(1);
    }
    console.log(`removed '${name}'`);
  });

const schedule = program.command('schedule').description('Manage the cron job that runs `hn watch --once`');

schedule
  .command('status')
  .description('Show whether the watch cron job is installed')
  .action(async () => {
    const { hasScheduledJob } = await import('./lib/schedule.js');
    console.log(hasScheduledJob() ? 'installed' : 'not installed');
  });

schedule
  .command('install')
  .description('Install the watch cron job (no-op if already installed)')
  .action(async () => {
    const { installScheduledJob } = await import('./lib/schedule.js');
    try {
      console.log(`installed: ${installScheduledJob()}`);
    } catch {
      console.error("couldn't find 'hn' on PATH; add the cron line yourself (see README)");
      process.exit(1);
    }
  });

schedule
  .command('remove')
  .description('Remove the watch cron job')
  .action(async () => {
    const { removeScheduledJob } = await import('./lib/schedule.js');
    console.log(removeScheduledJob() ? 'removed' : 'not installed');
  });

interface WatchCliOptions {
  once?: boolean;
  dryRun?: boolean;
}

program
  .command('watch')
  .description('Check subscriptions for new matches and notify (one-shot; cron owns scheduling)')
  .requiredOption('--once', 'run a single pass and exit (required; guards against future daemon semantics)')
  .option('--dry-run', 'print would-notify matches without sending or writing seen_items')
  .action(async (options: WatchCliOptions) => {
    const { runWatch } = await import('./watch.js');
    process.exit(await runWatch({ dryRun: Boolean(options.dryRun) }));
  });

program.parse();
