import { describe, expect, it } from 'vitest';
import type { Story } from '../api/firebase.js';
import { commentsHeaderLines } from './Comments.js';

const baseStory: Story = {
  id: 1,
  title: 'Short title',
  by: 'alice',
  score: 1,
  descendants: 0,
  time: 0,
};

describe('commentsHeaderLines', () => {
  it('counts border + title + meta + single-line url', () => {
    const story: Story = { ...baseStory, url: 'https://example.com/short' };
    expect(commentsHeaderLines(story, 100)).toBe(5);
  });

  it('counts border + title + meta, no url line when url is absent', () => {
    expect(commentsHeaderLines(baseStory, 100)).toBe(4);
  });

  // Regression: a url longer than the card's interior width word-wraps to 2 lines inside
  // the bordered card. Undercounting this shrinks the comment viewport by one row too few,
  // letting a row render past the terminal edge and corrupt the frame on a real TTY.
  it('accounts for a url wrapping to two lines inside the card', () => {
    const longUrl = `https://example.com/${'a'.repeat(100)}`;
    const story: Story = { ...baseStory, url: longUrl };
    expect(commentsHeaderLines(story, 100)).toBe(6);
  });

  it('accounts for a title wrapping to two lines', () => {
    const story: Story = { ...baseStory, title: 'word '.repeat(40).trim() };
    expect(commentsHeaderLines(story, 100)).toBeGreaterThan(4);
  });
});
