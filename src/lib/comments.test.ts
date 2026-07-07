import { describe, expect, it } from 'vitest';
import type { CommentNode } from '../api/algolia.js';
import { countDescendants, flattenSubtree } from './comments.js';

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

describe('flattenSubtree', () => {
  it('pins the parent at depth 0 followed by descendants at increasing depth', () => {
    const tree = node(1, [node(2, [node(3)]), node(4)]);
    expect(flattenSubtree(tree).map((f) => [f.node.id, f.depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 1],
    ]);
  });
});
