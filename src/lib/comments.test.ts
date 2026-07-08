import { describe, expect, it } from 'vitest';
import type { CommentNode } from '../api/algolia.js';
import { countDescendants } from './comments.js';

function node(id: number, children: CommentNode[] = []): CommentNode {
  return { id, author: `user${id}`, text: `text${id}`, time: 0, children };
}

describe('countDescendants', () => {
  it('is 0 for a leaf comment', () => {
    expect(countDescendants(node(1))).toBe(0);
  });

  it('counts the whole nested subtree, not just direct children', () => {
    const tree = node(1, [node(2, [node(3)]), node(4)]);
    expect(countDescendants(tree)).toBe(3);
  });
});
