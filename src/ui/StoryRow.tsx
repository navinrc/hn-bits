import { type JSX } from 'react';
import { Text } from 'ink';
import type { Story } from '../api/firebase.js';
import { formatAge, truncateTitle } from '../lib/format.js';
import { theme } from './theme.js';

interface StoryRowProps {
  story: Story;
  rank: number;
  isSelected: boolean;
  width: number;
}

export function StoryRow({ story, rank, isSelected, width }: StoryRowProps): JSX.Element {
  const marker = isSelected ? theme.glyphs.selection : ' ';
  const prefix = `${marker} ${rank}. `;
  const score = `${story.score}${theme.glyphs.points}`;
  const comments = `${story.descendants}${theme.glyphs.comments}`;
  const meta = `${formatAge(story.time)}  ${story.by}`;
  const suffix = `  ${score} ${comments}  ${meta}`;
  const title = truncateTitle(story.title, width - prefix.length - suffix.length);

  return (
    <Text inverse={isSelected}>
      {prefix}
      <Text color={theme.colors.title}>{title}</Text>
      {'  '}
      <Text color={theme.colors.score}>{score}</Text>
      {' '}
      <Text color={theme.colors.comment}>{comments}</Text>
      {'  '}
      <Text color={theme.colors.muted}>{meta}</Text>
    </Text>
  );
}
