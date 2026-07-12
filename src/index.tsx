#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';

const alternateScreen = process.stdout.isTTY === true;

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
  .version('0.1.0')
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
}

sub
  .command('add <name> <query...>')
  .description('Add a subscription')
  .option('--min-points <n>', 'minimum points threshold', '0')
  .action(async (name: string, queryParts: string[], options: SubAddOptions) => {
    const minPoints = Number(options.minPoints);
    if (!Number.isInteger(minPoints) || minPoints < 0) {
      console.error(`--min-points must be a non-negative integer, got '${options.minPoints}'`);
      process.exit(1);
    }
    const { addSubscription } = await import('./db/subscriptions.js');
    try {
      addSubscription(name, queryParts.join(' '), minPoints);
      console.log(`added '${name}'`);
    } catch (err) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

sub
  .command('list')
  .description('List subscriptions')
  .action(async () => {
    const { listSubscriptions } = await import('./db/subscriptions.js');
    const { formatAge } = await import('./lib/format.js');
    const subs = listSubscriptions();
    if (subs.length === 0) {
      console.log('no subscriptions yet');
      return;
    }
    const nameWidth = Math.max(...subs.map((s) => s.name.length));
    for (const s of subs) {
      const points = s.minPoints === 0 ? 'any' : `>=${s.minPoints}`;
      const lastRun = s.lastRunAt == null ? 'never' : `${formatAge(s.lastRunAt)} ago`;
      console.log(`${s.name.padEnd(nameWidth)}  "${s.query}"  ${points}  ${lastRun}`);
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
