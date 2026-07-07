import { describe, expect, it } from 'vitest';
import { getHostname } from './url.js';

describe('getHostname', () => {
  it('extracts hostname from a url', () => {
    expect(getHostname('https://example.com/a/b?c=1')).toBe('example.com');
  });

  it('returns undefined for a missing url (text post)', () => {
    expect(getHostname(undefined)).toBeUndefined();
  });

  it('returns undefined for an unparseable url', () => {
    expect(getHostname('not a url')).toBeUndefined();
  });
});
