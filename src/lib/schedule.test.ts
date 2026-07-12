import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ execSync: vi.fn() }));
vi.mock('node:child_process', () => ({ execSync: mocks.execSync }));

const FRAPPE_LINE =
  '0 */6 * * * cd /Users/navinrc/first-ben && bench --site all backup # bench auto backups';

function crontabFixture(...lines: string[]): string {
  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

/** Routes execSync by command so `crontab -l` / `crontab -` / `which hn` can each return canned output. */
function stubExecSync(options: { crontab?: string; hnPath?: string }): void {
  const { crontab = '', hnPath = '/usr/local/bin/hn' } = options;
  mocks.execSync.mockImplementation((command: string) => {
    if (command === 'crontab -l') {
      if (crontab === '') throw new Error('crontab: no crontab for user');
      return crontab;
    }
    if (command === 'which hn') return `${hnPath}\n`;
    if (command === 'crontab -') return '';
    throw new Error(`unexpected command: ${command}`);
  });
}

beforeEach(() => {
  mocks.execSync.mockReset();
});

describe('hasScheduledJob', () => {
  it('is false when there is no crontab at all', async () => {
    stubExecSync({ crontab: '' });
    const { hasScheduledJob } = await import('./schedule.js');
    expect(hasScheduledJob()).toBe(false);
  });

  it('is false when the crontab has only unrelated entries', async () => {
    stubExecSync({ crontab: crontabFixture(FRAPPE_LINE) });
    const { hasScheduledJob } = await import('./schedule.js');
    expect(hasScheduledJob()).toBe(false);
  });

  it('is true when the marked line is present', async () => {
    stubExecSync({ crontab: crontabFixture(FRAPPE_LINE, '*/30 * * * * /usr/local/bin/hn watch --once # hn-bits watch') });
    const { hasScheduledJob } = await import('./schedule.js');
    expect(hasScheduledJob()).toBe(true);
  });
});

describe('installScheduledJob', () => {
  it('writes a fresh single-line crontab when none exists', async () => {
    stubExecSync({ crontab: '' });
    const { installScheduledJob } = await import('./schedule.js');
    const line = installScheduledJob();

    expect(line).toContain('# hn-bits watch');
    expect(line).toContain('/usr/local/bin/hn watch --once');
    expect(mocks.execSync).toHaveBeenCalledWith('crontab -', { input: `${line}\n`, encoding: 'utf-8' });
  });

  it('appends to an existing crontab without touching unrelated lines', async () => {
    stubExecSync({ crontab: crontabFixture(FRAPPE_LINE) });
    const { installScheduledJob } = await import('./schedule.js');
    const line = installScheduledJob();

    expect(mocks.execSync).toHaveBeenCalledWith('crontab -', {
      input: `${FRAPPE_LINE}\n${line}\n`,
      encoding: 'utf-8',
    });
  });

  it('is a no-op returning the existing line when already installed', async () => {
    const existing = '*/30 * * * * /custom/hn watch --once # hn-bits watch';
    stubExecSync({ crontab: crontabFixture(FRAPPE_LINE, existing) });
    const { installScheduledJob } = await import('./schedule.js');
    const line = installScheduledJob();

    expect(line).toBe(existing);
    expect(mocks.execSync).not.toHaveBeenCalledWith('which hn');
    expect(mocks.execSync).not.toHaveBeenCalledWith('crontab -', expect.anything());
  });
});

describe('removeScheduledJob', () => {
  it('returns false when no job is installed', async () => {
    stubExecSync({ crontab: crontabFixture(FRAPPE_LINE) });
    const { removeScheduledJob } = await import('./schedule.js');
    expect(removeScheduledJob()).toBe(false);
    expect(mocks.execSync).not.toHaveBeenCalledWith('crontab -', expect.anything());
  });

  it('strips only the marked line, keeping unrelated entries', async () => {
    const managed = '*/30 * * * * /usr/local/bin/hn watch --once # hn-bits watch';
    stubExecSync({ crontab: crontabFixture(FRAPPE_LINE, managed) });
    const { removeScheduledJob } = await import('./schedule.js');

    expect(removeScheduledJob()).toBe(true);
    expect(mocks.execSync).toHaveBeenCalledWith('crontab -', {
      input: `${FRAPPE_LINE}\n`,
      encoding: 'utf-8',
    });
  });
});
