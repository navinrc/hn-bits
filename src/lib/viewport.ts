// Clamp/advance the window start so `selected` stays visible.
// Called every render with the current height, so terminal shrink is handled for free.
export function ensureVisible(offset: number, selected: number, height: number, count: number): number {
  const maxOffset = Math.max(0, count - height);
  let next = offset;
  if (selected < next) next = selected;
  if (selected >= next + height) next = selected - height + 1;
  return Math.min(Math.max(next, 0), maxOffset);
}

export function visibleSlice<T>(items: T[], offset: number, height: number): T[] {
  return items.slice(offset, offset + height);
}

export function shouldFetchMore(
  selected: number,
  fetchedCount: number,
  totalCount: number,
  threshold: number,
): boolean {
  return fetchedCount < totalCount && selected >= fetchedCount - threshold;
}
