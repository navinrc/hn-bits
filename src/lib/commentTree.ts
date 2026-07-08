import type { CommentNode } from '../api/algolia.js';
import { countDescendants } from './comments.js';

export interface FlatComment {
  node: CommentNode;
  depth: number;
  descendantCount: number;
  isFolded: boolean;
}

/** Depth-first flatten; children of folded ids are skipped. */
export function flattenTree(nodes: CommentNode[], folded: ReadonlySet<number>): FlatComment[] {
  return nodes.flatMap((node) => flattenNode(node, 0, folded));
}

function flattenNode(node: CommentNode, depth: number, folded: ReadonlySet<number>): FlatComment[] {
  const isFolded = folded.has(node.id);
  const entry: FlatComment = { node, depth, descendantCount: countDescendants(node), isFolded };
  if (isFolded) return [entry];
  return [entry, ...node.children.flatMap((child) => flattenNode(child, depth + 1, folded))];
}

export function toggleFold(folded: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(folded);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Every id that has children. */
export function collapseAll(nodes: CommentNode[]): Set<number> {
  const ids = new Set<number>();
  const visit = (node: CommentNode): void => {
    if (node.children.length > 0) ids.add(node.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return ids;
}

export function expandAll(): Set<number> {
  return new Set();
}
