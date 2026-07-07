import { describe, expect, it } from 'vitest';
import { formatAge } from './format.js';

const NOW = new Date('2026-07-07T12:00:00Z');

function secondsAgo(seconds: number): number {
  return Math.floor(NOW.getTime() / 1000) - seconds;
}

describe('formatAge', () => {
  it('shows minutes under an hour', () => {
    expect(formatAge(secondsAgo(30), NOW)).toBe('0m');
    expect(formatAge(secondsAgo(5 * 60), NOW)).toBe('5m');
  });

  it('shows hours at the one-hour boundary', () => {
    expect(formatAge(secondsAgo(3600), NOW)).toBe('1h');
  });

  it('shows hours under a day', () => {
    expect(formatAge(secondsAgo(3 * 3600), NOW)).toBe('3h');
  });

  it('shows days at the one-day boundary', () => {
    expect(formatAge(secondsAgo(86400), NOW)).toBe('1d');
  });

  it('shows days beyond a day', () => {
    expect(formatAge(secondsAgo(2 * 86400), NOW)).toBe('2d');
  });
});
