import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8')
) as { version: string };

const entry = fileURLToPath(new URL('./index.tsx', import.meta.url));

function runCli(args: string[], env: NodeJS.ProcessEnv): string {
  return execFileSync('npx', ['tsx', entry, ...args], { encoding: 'utf-8', env, input: '' });
}

describe('hn -V', () => {
  it('reports the version from package.json, not a hardcoded string', () => {
    const output = execFileSync('npx', ['tsx', entry, '-V'], { encoding: 'utf-8' }).trim();
    expect(output).toBe(packageJson.version);
  });
});

describe('hn sub add', () => {
  let dir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'hn-cli-'));
    env = { ...process.env, HN_BITS_DB: join(dir, 'hn-bits.db') };
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts a topic-less subscription when a threshold is set', () => {
    const output = runCli(['sub', 'add', 'hot', '--min-points', '250', '--min-comments', '100'], env);
    expect(output).toContain("added 'hot'");
    expect(runCli(['sub', 'list'], env)).toContain('hot  (any)  ≥250 pts or ≥100 cmts');
  });

  it('rejects a subscription with no query and no thresholds', () => {
    let error: (Error & { status?: number; stderr?: string }) | undefined;
    try {
      runCli(['sub', 'add', 'bad'], env);
    } catch (err) {
      error = err as Error & { status?: number; stderr?: string };
    }
    expect(error?.status).toBe(1);
    expect(String(error?.stderr)).toContain('query or at least one threshold');
  });
});
