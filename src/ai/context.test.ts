import { describe, expect, it } from 'vitest';
import type { CommentNode } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import { buildAskAIContext, buildThreadContext } from './context.js';

function node(id: number, author: string, text: string, children: CommentNode[] = []): CommentNode {
  return { id, author, text, time: 0, children };
}

describe('buildThreadContext', () => {
  it('renders top-level comments and replies with indentation', () => {
    const tree = [node(1, 'alice', 'top level', [node(2, 'bob', 'a reply')])];
    const result = buildThreadContext(tree);
    expect(result.text).toBe('alice: top level\n  bob: a reply');
    expect(result.includedTopLevel).toBe(1);
    expect(result.trimmed).toBe(false);
  });

  it('stops descending past depth 2', () => {
    const deep = node(4, 'deep', 'too deep');
    const depth2 = node(3, 'depth2', 'included', [deep]);
    const depth1 = node(2, 'depth1', 'included', [depth2]);
    const tree = [node(1, 'top', 'top', [depth1])];
    const result = buildThreadContext(tree);
    expect(result.text).toContain('depth2: included');
    expect(result.text).not.toContain('too deep');
  });

  it('caps a single comment body at 1000 chars', () => {
    const tree = [node(1, 'alice', 'x'.repeat(2000))];
    const result = buildThreadContext(tree);
    const bodyLine = result.text.split('\n')[0]!;
    expect(bodyLine.length).toBeLessThanOrEqual('alice: '.length + 1001);
    expect(bodyLine.endsWith('…')).toBe(true);
  });

  it('trims once the char budget is exceeded', () => {
    // Each comment caps at 1000 chars; 15 of them exceed the 12k thread budget.
    const tree = Array.from({ length: 15 }, (_, i) => node(i, `author${i}`, 'z'.repeat(1_200)));
    const result = buildThreadContext(tree);
    expect(result.includedTopLevel).toBeLessThan(15);
    expect(result.includedTopLevel).toBeGreaterThan(0);
    expect(result.trimmed).toBe(true);
  });

  it('always includes at least one top-level comment even if it alone exceeds the budget', () => {
    const tree = [node(1, 'a', 'a'.repeat(1_200)), node(2, 'b', 'second')];
    const result = buildThreadContext(tree);
    expect(result.includedTopLevel).toBeGreaterThanOrEqual(1);
  });

  it('decodes HTML in comment text', () => {
    const tree = [node(1, 'alice', 'a &amp; b')];
    expect(buildThreadContext(tree).text).toBe('alice: a & b');
  });
});

describe('buildAskAIContext', () => {
  const story: Story = { id: 1, title: 'Postgres 18', url: 'https://example.com', by: 'x', score: 100, descendants: 2, time: 0 };

  it('includes article text when available', () => {
    const text = buildAskAIContext({ story, article: { text: 'article body' }, comments: null });
    expect(text).toContain('article body');
    expect(text).toContain('Story: Postgres 18 (https://example.com) — 100 points, 2 comments');
    expect(text).toContain('not loaded');
  });

  it('reports unavailable article with a reason', () => {
    const text = buildAskAIContext({ story, article: null, articleUnavailableReason: 'not-html', comments: null });
    expect(text).toContain('unavailable: not-html');
  });

  it('includes trimmed discussion text when comments are loaded', () => {
    const tree = [node(1, 'alice', 'hello')];
    const text = buildAskAIContext({ story, article: null, comments: tree });
    expect(text).toContain('alice: hello');
  });

  it('falls back to text post label when story has no url', () => {
    const textPost: Story = { ...story, url: undefined };
    const text = buildAskAIContext({ story: textPost, article: null, comments: null });
    expect(text).toContain('(text post)');
  });
});
