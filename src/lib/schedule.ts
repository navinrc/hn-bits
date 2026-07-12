import { execSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

const MARKER = '# hn-bits watch';

function watchLogPath(): string {
  return join(homedir(), '.local', 'share', 'hn-bits', 'watch.log');
}

function readCrontab(): string {
  try {
    return execSync('crontab -l', { encoding: 'utf-8' });
  } catch {
    return '';
  }
}

function writeCrontab(content: string): void {
  execSync('crontab -', { input: content, encoding: 'utf-8' });
}

function resolveHnPath(): string {
  return execSync('which hn', { encoding: 'utf-8' }).trim();
}

function buildCronLine(hnPath: string): string {
  return `*/30 * * * * ${hnPath} watch --once >> ${watchLogPath()} 2>&1 ${MARKER}`;
}

export function hasScheduledJob(): boolean {
  return readCrontab()
    .split('\n')
    .some((line) => line.includes(MARKER));
}

/** Idempotent: no-ops if a job is already installed. Throws if `hn` isn't on PATH. */
export function installScheduledJob(): string {
  const current = readCrontab();
  const existing = current.split('\n').find((line) => line.includes(MARKER));
  if (existing) return existing;

  const line = buildCronLine(resolveHnPath());
  const body = current.trim().length > 0 ? `${current.replace(/\n+$/, '')}\n${line}\n` : `${line}\n`;
  writeCrontab(body);
  return line;
}

export function removeScheduledJob(): boolean {
  const lines = readCrontab().split('\n');
  const filtered = lines.filter((line) => !line.includes(MARKER));
  if (filtered.length === lines.length) return false;
  writeCrontab(filtered.join('\n'));
  return true;
}
