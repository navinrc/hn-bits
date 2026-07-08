import { type JSX } from 'react';
import { Box } from 'ink';
import type { Story } from '../api/firebase.js';
import { visibleSlice } from '../lib/viewport.js';
import { StoryRow } from './StoryRow.js';

interface StoryListViewProps {
  stories: Story[];
  selected: number;
  offset: number;
  height: number;
  width: number;
}

export function StoryListView({ stories, selected, offset, height, width }: StoryListViewProps): JSX.Element {
  const visible = visibleSlice(stories, offset, height);

  return (
    <Box flexDirection="column">
      {visible.map((story, i) => {
        const index = offset + i;
        return (
          <StoryRow key={story.id} story={story} rank={index + 1} isSelected={index === selected} width={width} />
        );
      })}
    </Box>
  );
}
