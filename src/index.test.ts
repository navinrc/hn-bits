import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageJson = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf-8')
) as { version: string };

describe('hn -V', () => {
  it('reports the version from package.json, not a hardcoded string', () => {
    const entry = fileURLToPath(new URL('./index.tsx', import.meta.url));
    const output = execFileSync('npx', ['tsx', entry, '-V'], { encoding: 'utf-8' }).trim();
    expect(output).toBe(packageJson.version);
  });
});
