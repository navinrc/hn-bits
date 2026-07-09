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

export interface RevealState {
  headerOnly: ReadonlySet<number>;
  revealed: ReadonlySet<number>;
}

/** Moves an id from header-only into revealed, so C-originated leaves can toggle back. */
export function revealHeaderOnly(state: RevealState, id: number): RevealState {
  const headerOnly = new Set(state.headerOnly);
  headerOnly.delete(id);
  return { headerOnly, revealed: new Set(state.revealed).add(id) };
}

/** Moves a revealed id back to header-only — the leaf half of the header ↔ body toggle. */
export function rehideRevealed(state: RevealState, id: number): RevealState {
  const revealed = new Set(state.revealed);
  revealed.delete(id);
  return { headerOnly: new Set(state.headerOnly).add(id), revealed };
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
