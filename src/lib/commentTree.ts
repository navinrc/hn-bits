import type { CommentNode } from '../api/algolia.js';
import { countDescendants } from './comments.js';

export interface FlatComment {
  node: CommentNode;
  depth: number;
  descendantCount: number;
  /** Children not rendered — set by folding this node or by header-only state. */
  childrenHidden: boolean;
  /** Own body not rendered — row is just the header line. */
  headerOnly: boolean;
}

/** Depth-first flatten; children are skipped when a node is folded or header-only. */
export function flattenTree(
  nodes: CommentNode[],
  folded: ReadonlySet<number>,
  headerOnly: ReadonlySet<number>,
): FlatComment[] {
  return nodes.flatMap((node) => flattenNode(node, 0, folded, headerOnly));
}

function flattenNode(
  node: CommentNode,
  depth: number,
  folded: ReadonlySet<number>,
  headerOnly: ReadonlySet<number>,
): FlatComment[] {
  const isHeaderOnly = headerOnly.has(node.id);
  const childrenHidden = isHeaderOnly || folded.has(node.id);
  const entry: FlatComment = {
    node,
    depth,
    descendantCount: countDescendants(node),
    childrenHidden,
    headerOnly: isHeaderOnly,
  };
  if (childrenHidden) return [entry];
  return [entry, ...node.children.flatMap((child) => flattenNode(child, depth + 1, folded, headerOnly))];
}

export function toggleFold(folded: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(folded);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Removes a node from the header-only set; never re-adds (opening a header-only row is one-way). */
export function revealHeaderOnly(headerOnly: ReadonlySet<number>, id: number): Set<number> {
  const next = new Set(headerOnly);
  next.delete(id);
  return next;
}

/** Every id that has children — the default/collapsed fold set (body shown, children hidden). */
export function collapseAll(nodes: CommentNode[]): Set<number> {
  const ids = new Set<number>();
  const visit = (node: CommentNode): void => {
    if (node.children.length > 0) ids.add(node.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return ids;
}

/** Every id, parents and leaves — the header-only set produced by `C` (collapse all). */
export function headerOnlyAll(nodes: CommentNode[]): Set<number> {
  const ids = new Set<number>();
  const visit = (node: CommentNode): void => {
    ids.add(node.id);
    node.children.forEach(visit);
  };
  nodes.forEach(visit);
  return ids;
}
