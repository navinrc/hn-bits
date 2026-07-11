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
  .command('theme')
  .description('Show the active color theme and available palettes')
  .action(async () => {
    const { paletteNames, resolvePaletteName } = await import('./ui/theme.js');
    const activeName = resolvePaletteName(program.opts<GlobalOptions>().theme);
    console.log(`Active theme: ${activeName}`);
    console.log(`Available: ${paletteNames().join(', ')}`);
    console.log('Set with `hn --theme <name>` or the HN_THEME environment variable.');
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

program.parse();
