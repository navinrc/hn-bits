import { type JSX } from 'react';
import { Box, Text } from 'ink';
import type { Story } from '../api/firebase.js';
import { isBookmarked } from '../db/bookmarks.js';
import { formatAge, truncateTitle } from '../lib/format.js';
import { getHostname } from '../lib/url.js';
import { useTheme } from './theme.js';

export const STORY_ROW_HEIGHT = 3;

interface StoryRowProps {
  story: Story;
  rank: number;
  rankWidth: number;
  isSelected: boolean;
  width: number;
  showMeta?: boolean;
  showSeparator?: boolean;
}

function fillPad(isSelected: boolean, safeWidth: number, usedLength: number): string {
  return isSelected ? ' '.repeat(Math.max(0, safeWidth - usedLength)) : '';
}

function metaText(story: Story): string {
  return `${story.score} points by ${story.by} ${formatAge(story.time)} ago | ${story.descendants} comments`;
}

export function StoryRow({
  story,
  rank,
  rankWidth,
  isSelected,
  width,
  showMeta = true,
  showSeparator = true,
}: StoryRowProps): JSX.Element {
  const theme = useTheme();
  // Never let a line's content reach the literal terminal edge: a line that exactly
  // fills the width triggers a VT100 delayed-wrap that corrupts Ink's cursor position
  // for the row below it.
  const safeWidth = Math.max(1, width - 1);
  const marker = isSelected ? theme.glyphs.selection : ' ';
  const prefix = `${marker} ${String(rank).padStart(rankWidth)}. `;
  const hostname = getHostname(story.url);
  const hostnameSuffix = hostname ? ` (${hostname})` : '';
  const titleWidth = Math.max(1, safeWidth - prefix.length - hostnameSuffix.length);
  const title = truncateTitle(story.title, titleWidth);
  const background = isSelected ? theme.colors.selectionBackground : undefined;
  const bookmarked = isBookmarked(story.id);
  const starPrefix = bookmarked ? `${theme.glyphs.bookmark} ` : '';
  const meta = `${starPrefix}${metaText(story)}`;

  return (
    <Box flexDirection="column">
      <Text backgroundColor={background}>
        {prefix}
        <Text bold color={theme.colors.title}>
          {title}
        </Text>
        {hostname && <Text color={theme.colors.muted}>{hostnameSuffix}</Text>}
        {fillPad(isSelected, safeWidth, prefix.length + title.length + hostnameSuffix.length)}
      </Text>
      {showMeta && (
        <Text backgroundColor={background}>
          {' '.repeat(prefix.length)}
          {bookmarked && <Text color={theme.colors.accent}>{starPrefix}</Text>}
          <Text color={theme.colors.score}>{story.score} points</Text>
          <Text color={theme.colors.muted}>
            {' '}
            by {story.by} {formatAge(story.time)} ago | {story.descendants} comments
          </Text>
          {fillPad(isSelected, safeWidth, prefix.length + meta.length)}
        </Text>
      )}
      {showSeparator && <Text> </Text>}
    </Box>
  );
}
