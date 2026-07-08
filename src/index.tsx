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

program.parse();
