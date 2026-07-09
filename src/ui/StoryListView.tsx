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
  const rankWidth = String(stories.length).length;

  return (
    <Box flexDirection="column">
      {stories.slice(first, last + 1).map((story, i) => {
        const index = first + i;
        const clip = (index === first ? clipTop : 0) + (index === last ? clipBottom : 0);
        // Edge clipping order: separator drops first, then meta, then title — title is always last standing.
        const visibleLines = STORY_ROW_HEIGHT - clip;
        return (
          <StoryRow
            key={story.id}
            story={story}
            rank={index + 1}
            rankWidth={rankWidth}
            isSelected={index === selected}
            width={width}
            showMeta={visibleLines >= 2}
            showSeparator={visibleLines >= 3}
          />
        );
      })}
    </Box>
  );
}
