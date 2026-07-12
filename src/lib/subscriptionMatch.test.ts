import { describe, expect, it } from 'vitest';
import type { Story } from '../api/firebase.js';
import { passesThreshold } from './subscriptionMatch.js';

function story(score: number, descendants: number): Story {
  return { id: 1, title: 't', by: 'a', score, descendants, time: 0 };
}

describe('passesThreshold', () => {
  it('matches everything when both thresholds are 0', () => {
    expect(passesThreshold(story(0, 0), 0, 0)).toBe(true);
  });

  it('acts as a plain points floor when minComments is 0', () => {
    expect(passesThreshold(story(19, 999), 20, 0)).toBe(false);
    expect(passesThreshold(story(20, 0), 20, 0)).toBe(true);
  });

  it('acts as a plain comments floor when minPoints is 0', () => {
    expect(passesThreshold(story(999, 4), 0, 5)).toBe(false);
    expect(passesThreshold(story(0, 5), 0, 5)).toBe(true);
  });

  it('ORs the two thresholds when both are set', () => {
    expect(passesThreshold(story(20, 0), 20, 5)).toBe(true);
    expect(passesThreshold(story(0, 5), 20, 5)).toBe(true);
    expect(passesThreshold(story(19, 4), 20, 5)).toBe(false);
  });
});
