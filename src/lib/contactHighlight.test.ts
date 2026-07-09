import { describe, expect, it } from 'vitest';
import { tokenizeContacts } from './contactHighlight.js';

describe('tokenizeContacts', () => {
  it('returns a single plain token when there is no contact', () => {
    expect(tokenizeContacts('just some text')).toEqual([{ text: 'just some text' }]);
  });

  it('tags a bare url as a link token', () => {
    expect(tokenizeContacts('see https://example.com/path for more')).toEqual([
      { text: 'see ' },
      { text: 'https://example.com/path', kind: 'link' },
      { text: ' for more' },
    ]);
  });

  it('tags an email as an email token', () => {
    expect(tokenizeContacts('reach me at bob@example.com please')).toEqual([
      { text: 'reach me at ' },
      { text: 'bob@example.com', kind: 'email' },
      { text: ' please' },
    ]);
  });

  it('handles multiple contacts in one line', () => {
    expect(tokenizeContacts('https://a.com and bob@b.com')).toEqual([
      { text: 'https://a.com', kind: 'link' },
      { text: ' and ' },
      { text: 'bob@b.com', kind: 'email' },
    ]);
  });

  it('handles an empty line', () => {
    expect(tokenizeContacts('')).toEqual([{ text: '' }]);
  });
});
