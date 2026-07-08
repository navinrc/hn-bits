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

// Deterministic greedy word-wrap; words longer than `width` are hard-broken.
export function wrapPlainText(text: string, width: number): string[] {
  const safeWidth = Math.max(1, width);
  return text.split('\n').flatMap((line) => wrapLine(line, safeWidth));
}

function wrapLine(line: string, width: number): string[] {
  const rows: string[] = [];
  let current = '';
  for (const word of line.split(' ')) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;
    if (candidate.length <= width) {
      current = candidate;
      continue;
    }
    if (current.length > 0) rows.push(current);
    current = word;
    while (current.length > width) {
      rows.push(current.slice(0, width));
      current = current.slice(width);
    }
  }
  if (current.length > 0) rows.push(current);
  return rows.length > 0 ? rows : [''];
}

function lineStart(heights: number[], index: number): number {
  return heights.slice(0, index).reduce((sum, h) => sum + h, 0);
}

function totalLines(heights: number[]): number {
  return heights.reduce((sum, h) => sum + h, 0);
}

// Line-based analogue of ensureVisible: keeps the selected row's first line visible.
export function ensureVisibleLines(
  heights: number[],
  selected: number,
  topLine: number,
  viewportLines: number,
): number {
  const start = lineStart(heights, selected);
  const maxTop = Math.max(0, totalLines(heights) - viewportLines);
  let next = topLine;
  if (start < next) next = start;
  if (start >= next + viewportLines) next = start - viewportLines + 1;
  return Math.min(Math.max(next, 0), maxTop);
}

// Which rows intersect [topLine, topLine + viewportLines), and how many lines to clip at each edge.
export function sliceByLines(
  heights: number[],
  topLine: number,
  viewportLines: number,
): { first: number; last: number; clipTop: number; clipBottom: number } {
  const empty = { first: 0, last: -1, clipTop: 0, clipBottom: 0 };
  if (heights.length === 0 || viewportLines <= 0) return empty;

  const starts = heights.map((_, i) => lineStart(heights, i));
  const total = totalLines(heights);
  const windowStart = Math.max(0, Math.min(topLine, total));
  const windowEnd = Math.min(total, windowStart + viewportLines);
  if (windowEnd <= windowStart) return empty;

  let first = 0;
  while (first < heights.length && starts[first]! + heights[first]! <= windowStart) first++;
  let last = first;
  while (last + 1 < heights.length && starts[last + 1]! < windowEnd) last++;

  const clipTop = windowStart - starts[first]!;
  const clipBottom = Math.max(0, starts[last]! + heights[last]! - windowEnd);
  return { first, last, clipTop, clipBottom };
}
