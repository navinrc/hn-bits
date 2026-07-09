import { type JSX } from 'react';
import { Box, Text } from 'ink';
import type { Story } from '../api/firebase.js';
import { formatAge, truncateTitle } from '../lib/format.js';
import { getHostname } from '../lib/url.js';
import { theme } from './theme.js';

export const STORY_ROW_HEIGHT = 2;

interface StoryRowProps {
  story: Story;
  rank: number;
  isSelected: boolean;
  width: number;
  showMeta?: boolean;
}

export function StoryRow({ story, rank, isSelected, width, showMeta = true }: StoryRowProps): JSX.Element {
  const marker = isSelected ? theme.glyphs.selection : ' ';
  const prefix = `${marker} ${rank}. `;
  const hostname = getHostname(story.url);
  const hostnameSuffix = hostname ? ` (${hostname})` : '';
  const titleWidth = Math.max(1, width - prefix.length - hostnameSuffix.length);
  const title = truncateTitle(story.title, titleWidth);
  const lineLength = prefix.length + title.length + hostnameSuffix.length;
  const pad = isSelected ? ' '.repeat(Math.max(0, width - lineLength)) : '';

  return (
    <Box flexDirection="column">
      <Text backgroundColor={isSelected ? theme.colors.selectionBackground : undefined}>
        {prefix}
        <Text bold color={theme.colors.title}>
          {title}
        </Text>
        {hostname && <Text color={theme.colors.muted}>{hostnameSuffix}</Text>}
        {pad}
      </Text>
      {showMeta && (
        <Text>
          {' '.repeat(prefix.length)}
          <Text color={theme.colors.score}>{story.score} points</Text>
          <Text color={theme.colors.muted}>
            {' '}
            by {story.by} {formatAge(story.time)} ago | {story.descendants} comments
          </Text>
        </Text>
      )}
    </Box>
  );
}
