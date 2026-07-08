import type { CommentNode } from '../api/algolia.js';

export function countDescendants(node: CommentNode): number {
  return node.children.reduce((total, child) => total + 1 + countDescendants(child), 0);
}
