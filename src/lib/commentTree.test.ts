import { describe, expect, it } from 'vitest';
import type { CommentNode } from '../api/algolia.js';
import { collapseAll, expandAll, flattenTree, toggleFold } from './commentTree.js';

function node(id: number, children: CommentNode[] = []): CommentNode {
  return { id, author: `user${id}`, text: `text${id}`, time: 0, children };
}

const tree = [node(1, [node(2, [node(3)]), node(4)]), node(5)];

describe('flattenTree', () => {
  it('flattens depth-first with correct depths when nothing is folded', () => {
    const flat = flattenTree(tree, new Set());
    expect(flat.map((f) => [f.node.id, f.depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 1],
      [5, 0],
    ]);
  });

  it('skips the subtree of a folded node but keeps the node itself', () => {
    const flat = flattenTree(tree, new Set([2]));
    expect(flat.map((f) => f.node.id)).toEqual([1, 2, 4, 5]);
  });

  it('reports descendant counts and fold state per node', () => {
    const flat = flattenTree(tree, new Set([1]));
    expect(flat[0]).toEqual({ node: tree[0], depth: 0, descendantCount: 3, isFolded: true });
  });
});

describe('toggleFold', () => {
  it('adds an id that is not folded', () => {
    expect([...toggleFold(new Set(), 2)]).toEqual([2]);
  });

  it('removes an id that is already folded', () => {
    expect([...toggleFold(new Set([2]), 2)]).toEqual([]);
  });

  it('does not mutate the input set', () => {
    const folded = new Set([2]);
    toggleFold(folded, 3);
    expect([...folded]).toEqual([2]);
  });
});

describe('collapseAll', () => {
  it('collects every id that has children, skipping leaves', () => {
    expect([...collapseAll(tree)].sort()).toEqual([1, 2]);
  });

  it('is empty when every node is a leaf', () => {
    expect([...collapseAll([node(9)])]).toEqual([]);
  });
});

describe('expandAll', () => {
  it('is always the empty set', () => {
    expect([...expandAll()]).toEqual([]);
  });
});
