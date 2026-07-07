import { type JSX } from 'react';
import { Text } from 'ink';
import type { Story } from '../api/firebase.js';
import { formatAge } from '../lib/format.js';

interface StoryRowProps {
  story: Story;
  rank: number;
  isSelected: boolean;
}

export function StoryRow({ story, rank, isSelected }: StoryRowProps): JSX.Element {
  const marker = isSelected ? '▸' : ' ';
  return (
    <Text inverse={isSelected}>
      {marker} {rank}. {story.title}  {story.score}⯅ {story.descendants}💬 {formatAge(story.time)}  {story.by}
    </Text>
  );
}
