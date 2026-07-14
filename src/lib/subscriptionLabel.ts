/** `"rust"` / `(any)` for empty query — shared by CLI and TUI. */
export function queryLabel(query: string): string {
  return query ? `"${query}"` : '(any)';
}

/** "any" / "≥20 pts" / "≥5 cmts" / "≥20 pts or ≥5 cmts" — shared by CLI and TUI. */
export function thresholdLabel(minPoints: number, minComments: number): string {
  const parts: string[] = [];
  if (minPoints > 0) parts.push(`≥${minPoints} pts`);
  if (minComments > 0) parts.push(`≥${minComments} cmts`);
  return parts.length === 0 ? 'any' : parts.join(' or ');
}
