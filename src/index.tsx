#!/usr/bin/env node
import { Command } from 'commander';
import { render } from 'ink';
import { App } from './ui/App.js';

const program = new Command();
program.name('hn').description('Terminal-first Hacker News client').version('0.1.0');
program.action(() => {
  render(<App />);
});
program.parse();
