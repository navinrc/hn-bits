import { type JSX } from 'react';
import { Box } from 'ink';
import type { Story } from '../api/firebase.js';
import { sliceByLines } from '../lib/viewport.js';
import { STORY_ROW_HEIGHT, StoryRow } from './StoryRow.js';

interface StoryListViewProps {
  stories: Story[];
  selected: number;
  topLine: number;
  height: number;
  width: number;
}

export function StoryListView({ stories, selected, topLine, height, width }: StoryListViewProps): JSX.Element {
  const heights = stories.map(() => STORY_ROW_HEIGHT);
  const { first, last, clipTop, clipBottom } = sliceByLines(heights, topLine, height);

  return (
    <Box flexDirection="column">
      {stories.slice(first, last + 1).map((story, i) => {
        const index = first + i;
        // A row clipped to a single line always shows its title, never its meta line.
        const isPartial = (index === first && clipTop > 0) || (index === last && clipBottom > 0);
        return (
          <StoryRow
            key={story.id}
            story={story}
            rank={index + 1}
            isSelected={index === selected}
            width={width}
            showMeta={!isPartial}
          />
        );
      })}
    </Box>
  );
}
