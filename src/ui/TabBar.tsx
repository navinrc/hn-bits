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

interface Segment {
  text: string;
  active?: boolean;
  brand?: boolean;
}

interface TabLine {
  segments: Segment[];
  activeWallColumn: number;
  activeInnerWidth: number;
}

function tabSegment(tab: Tab, active: Feed): { segment: Segment; width: number } {
  if (tab.feed !== active) return { segment: { text: tab.label }, width: tab.label.length };
  const inner = ` ${tab.label} `;
  return { segment: { text: `│${inner}│`, active: true }, width: inner.length };
}

function buildTabSegments(active: Feed): TabLine {
  const segments: Segment[] = [{ text: `  ${BRAND}${TAB_GAP}`, brand: true }];
  let column = segments[0]!.text.length;
  let activeWallColumn = 0;
  let activeInnerWidth = 0;

  TABS.forEach((tab, index) => {
    if (index > 0) {
      segments.push({ text: TAB_GAP });
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
  segments.push({ text: ' '.repeat(padding) }, { text: HELP_HINT });
}

function buildLine(active: Feed, columns: number): TabLine {
  const line = buildTabSegments(active);
  const usedColumns = line.segments.reduce((sum, segment) => sum + segment.text.length, 0);
  appendHint(line.segments, usedColumns, columns);
  return line;
}

function overlay(base: string, column: number, replacement: string): string {
  return base.slice(0, column) + replacement + base.slice(column + replacement.length);
}

function buildTopBorder(columns: number, wallColumn: number, innerWidth: number): string {
  const box = `╭${'─'.repeat(innerWidth)}╮`;
  return overlay(' '.repeat(columns), wallColumn, box);
}

function buildBottomRule(columns: number, wallColumn: number, innerWidth: number): string {
  const notch = `╯${' '.repeat(innerWidth)}╰`;
  return overlay('─'.repeat(columns), wallColumn, notch);
}

export function TabBar({ active }: TabBarProps): JSX.Element {
  const { columns } = useWindowSize();
  const line = buildLine(active, columns);

  return (
    <Box flexDirection="column">
      <Text dimColor>{buildTopBorder(columns, line.activeWallColumn, line.activeInnerWidth)}</Text>
      <Box>
        {line.segments.map((segment, index) => (
          <Text
            key={index}
            bold={segment.active ?? segment.brand}
            color={segment.active ?? segment.brand ? theme.colors.accent : theme.colors.muted}
          >
            {segment.text}
          </Text>
        ))}
      </Box>
      <Text dimColor>{buildBottomRule(columns, line.activeWallColumn, line.activeInnerWidth)}</Text>
    </Box>
  );
}
