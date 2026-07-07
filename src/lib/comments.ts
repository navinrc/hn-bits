import type { CommentNode } from '../api/algolia.js';

export function countDescendants(node: CommentNode): number {
  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
}

export interface FlattenedComment {
  node: CommentNode;
  depth: number;
}

/** Parent pinned at depth 0, followed by its full descendant subtree. */
export function flattenSubtree(node: CommentNode): FlattenedComment[] {
  return [{ node, depth: 0 }, ...flattenChildren(node.children, 1)];
}

function flattenChildren(children: CommentNode[], depth: number): FlattenedComment[] {
  return children.flatMap((child) => [
    { node: child, depth },
    ...flattenChildren(child.children, depth + 1),
  ]);
}
