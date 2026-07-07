#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import { App } from './ui/App.js';

const program = new Command();
program.name('hn').description('Terminal-first Hacker News client').version('0.1.0');
program.action(() => {
  render(<App />);
});
program
  .command('search <query...>')
  .description('Search stories by keyword')
  .action((queryParts: string[]) => {
    render(<App initialQuery={queryParts.join(' ')} />);
  });
program.parse();
