import { describe, expect, it } from 'vitest';
import type { CommentNode } from '../api/algolia.js';
import {
  collapseAll,
  flattenTree,
  headerOnlyAll,
  rehideRevealed,
  revealHeaderOnly,
  toggleFold,
} from './commentTree.js';

function node(id: number, children: CommentNode[] = []): CommentNode {
  return { id, author: `user${id}`, text: `text${id}`, time: 0, children };
}

const tree = [node(1, [node(2, [node(3)]), node(4)]), node(5)];

describe('flattenTree', () => {
  it('flattens depth-first with correct depths when nothing is folded', () => {
    const flat = flattenTree(tree, new Set(), new Set());
    expect(flat.map((f) => [f.node.id, f.depth])).toEqual([
      [1, 0],
      [2, 1],
      [3, 2],
      [4, 1],
      [5, 0],
    ]);
  });

  it('skips the subtree of a folded node but keeps the node itself', () => {
    const flat = flattenTree(tree, new Set([2]), new Set());
    expect(flat.map((f) => f.node.id)).toEqual([1, 2, 4, 5]);
  });

  it('reports descendant counts and child-visibility per node', () => {
    const flat = flattenTree(tree, new Set([1]), new Set());
    expect(flat[0]).toEqual({ node: tree[0], depth: 0, descendantCount: 3, childrenHidden: true, headerOnly: false });
  });

  it('hides children of a header-only node even when it is not in the folded set', () => {
    const flat = flattenTree(tree, new Set(), new Set([1]));
    expect(flat.map((f) => f.node.id)).toEqual([1, 5]);
    expect(flat[0]).toMatchObject({ childrenHidden: true, headerOnly: true });
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

describe('revealHeaderOnly', () => {
  it('moves the id from header-only into revealed', () => {
    const next = revealHeaderOnly({ headerOnly: new Set([1, 2]), revealed: new Set() }, 1);
    expect([...next.headerOnly]).toEqual([2]);
    expect([...next.revealed]).toEqual([1]);
  });

  it('still tracks the id as revealed when it was absent from header-only', () => {
    const next = revealHeaderOnly({ headerOnly: new Set([2]), revealed: new Set() }, 1);
    expect([...next.headerOnly]).toEqual([2]);
    expect([...next.revealed]).toEqual([1]);
  });

  it('does not mutate the input sets', () => {
    const state = { headerOnly: new Set([1]), revealed: new Set<number>() };
    revealHeaderOnly(state, 1);
    expect([...state.headerOnly]).toEqual([1]);
    expect([...state.revealed]).toEqual([]);
  });
});

describe('rehideRevealed', () => {
  it('moves the id from revealed back into header-only', () => {
    const next = rehideRevealed({ headerOnly: new Set(), revealed: new Set([1, 2]) }, 1);
    expect([...next.headerOnly]).toEqual([1]);
    expect([...next.revealed]).toEqual([2]);
  });

  it('round-trips with revealHeaderOnly', () => {
    const start = { headerOnly: new Set([1]), revealed: new Set<number>() };
    const next = rehideRevealed(revealHeaderOnly(start, 1), 1);
    expect([...next.headerOnly]).toEqual([1]);
    expect([...next.revealed]).toEqual([]);
  });

  it('does not mutate the input sets', () => {
    const state = { headerOnly: new Set<number>(), revealed: new Set([1]) };
    rehideRevealed(state, 1);
    expect([...state.headerOnly]).toEqual([]);
    expect([...state.revealed]).toEqual([1]);
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

describe('headerOnlyAll', () => {
  it('collects every id, including leaves', () => {
    expect([...headerOnlyAll(tree)].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });
});
