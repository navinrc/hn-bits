import { type JSX } from 'react';
import { Text } from 'ink';
import type { Story } from '../api/firebase.js';
import { formatAge, truncateTitle } from '../lib/format.js';

interface StoryRowProps {
  story: Story;
  rank: number;
  isSelected: boolean;
  width: number;
}

export function StoryRow({ story, rank, isSelected, width }: StoryRowProps): JSX.Element {
  const marker = isSelected ? '▸' : ' ';
  const prefix = `${marker} ${rank}. `;
  const suffix = `  ${story.score}⯅ ${story.descendants}💬 ${formatAge(story.time)}  ${story.by}`;
  const title = truncateTitle(story.title, width - prefix.length - suffix.length);

  return (
    <Text inverse={isSelected}>
      {prefix}
      {title}
      {suffix}
    </Text>
  );
}
