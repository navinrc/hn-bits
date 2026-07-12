import { describe, expect, it } from 'vitest';
import { thresholdLabel } from './subscriptionLabel.js';

describe('thresholdLabel', () => {
  it('returns "any" when both thresholds are 0', () => {
    expect(thresholdLabel(0, 0)).toBe('any');
  });

  it('shows only points when minComments is 0', () => {
    expect(thresholdLabel(20, 0)).toBe('≥20 pts');
  });

  it('shows only comments when minPoints is 0', () => {
    expect(thresholdLabel(0, 5)).toBe('≥5 cmts');
  });

  it('shows both, OR-joined, when both are set', () => {
    expect(thresholdLabel(20, 5)).toBe('≥20 pts or ≥5 cmts');
  });
});
