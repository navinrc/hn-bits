import { type JSX } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import type { Feed } from '../api/firebase.js';
import { theme } from './theme.js';

interface TabBarProps {
  active: Feed;
}

interface Tab {
  feed: Feed;
  label: string;
}

const TABS: Tab[] = [
  { feed: 'top', label: 'Top' },
  { feed: 'new', label: 'New' },
  { feed: 'best', label: 'Best' },
  { feed: 'ask', label: 'Ask' },
  { feed: 'show', label: 'Show' },
];

const BRAND = 'Hacker News';
const HELP_HINT = '? help';
const TAB_GAP = '   ';

type SegmentColor = 'accent' | 'muted';

interface Segment {
  text: string;
  color: SegmentColor;
  bold?: boolean;
}

interface TabLine {
  segments: Segment[];
  activeWallColumn: number;
  activeInnerWidth: number;
}

function tabSegment(tab: Tab, active: Feed): { segment: Segment; width: number } {
  if (tab.feed !== active) return { segment: { text: tab.label, color: 'muted' }, width: tab.label.length };
  const inner = ` ${tab.label} `;
  return { segment: { text: `│${inner}│`, color: 'accent', bold: true }, width: inner.length };
}

function buildTabSegments(active: Feed): TabLine {
  const segments: Segment[] = [{ text: `  ${BRAND}${TAB_GAP}`, color: 'accent', bold: true }];
  let column = segments[0]!.text.length;
  let activeWallColumn = 0;
  let activeInnerWidth = 0;

  TABS.forEach((tab, index) => {
    if (index > 0) {
      segments.push({ text: TAB_GAP, color: 'muted' });
      column += TAB_GAP.length;
    }
    const { segment, width } = tabSegment(tab, active);
    segments.push(segment);
    if (tab.feed === active) {
      activeWallColumn = column;
      activeInnerWidth = width;
    }
    column += segment.text.length;
  });

  return { segments, activeWallColumn, activeInnerWidth };
}

function appendHint(segments: Segment[], usedColumns: number, columns: number): void {
  const padding = Math.max(1, columns - usedColumns - HELP_HINT.length);
  segments.push({ text: ' '.repeat(padding), color: 'muted' }, { text: HELP_HINT, color: 'muted' });
}

function buildLine(active: Feed, columns: number): TabLine {
  const line = buildTabSegments(active);
  const usedColumns = line.segments.reduce((sum, segment) => sum + segment.text.length, 0);
  appendHint(line.segments, usedColumns, columns);
  return line;
}

/** Splits `base` into dim/accent segments, with `replacement` overlaid as accent at `start`. */
function splitAccent(base: string, start: number, replacement: string): Segment[] {
  const before = base.slice(0, start);
  const after = base.slice(start + replacement.length);
  const segments: Segment[] = [];
  if (before) segments.push({ text: before, color: 'muted' });
  segments.push({ text: replacement, color: 'accent' });
  if (after) segments.push({ text: after, color: 'muted' });
  return segments;
}

function buildTopBorderSegments(columns: number, wallColumn: number, innerWidth: number): Segment[] {
  const box = `╭${'─'.repeat(innerWidth)}╮`;
  return splitAccent(' '.repeat(columns), wallColumn, box);
}

function buildBottomRuleSegments(columns: number, wallColumn: number, innerWidth: number): Segment[] {
  const notch = `╯${' '.repeat(innerWidth)}╰`;
  const base = '─'.repeat(columns);
  const line = base.slice(0, wallColumn) + notch + base.slice(wallColumn + notch.length);
  return [{ text: line, color: 'accent' }];
}

function segmentColor(color: SegmentColor): string {
  return color === 'accent' ? theme.colors.accent : theme.colors.muted;
}

function SegmentRow({ segments }: { segments: Segment[] }): JSX.Element {
  return (
    <Box>
      {segments.map((segment, index) => (
        <Text key={index} bold={segment.bold} color={segmentColor(segment.color)}>
          {segment.text}
        </Text>
      ))}
    </Box>
  );
}

export function TabBar({ active }: TabBarProps): JSX.Element {
  const { columns } = useWindowSize();
  const line = buildLine(active, columns);

  return (
    <Box flexDirection="column">
      <SegmentRow segments={buildTopBorderSegments(columns, line.activeWallColumn, line.activeInnerWidth)} />
      <SegmentRow segments={line.segments} />
      <SegmentRow segments={buildBottomRuleSegments(columns, line.activeWallColumn, line.activeInnerWidth)} />
    </Box>
  );
}
