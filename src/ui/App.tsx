import { useState, type JSX } from 'react';
import { Box, useApp, useInput } from 'ink';
import type { Feed, Story } from '../api/firebase.js';
import { Comments } from './Comments.js';
import { StoryDetail } from './StoryDetail.js';
import { StoryList } from './StoryList.js';

type View =
  | { name: 'list' }
  | { name: 'detail'; story: Story }
  | { name: 'comments'; story: Story };

export function App(): JSX.Element {
  const [feed, setFeed] = useState<Feed>('top');
  const [view, setView] = useState<View>({ name: 'list' });
  const { exit } = useApp();

  useInput((input) => {
    if (input === 'q') exit();
  });

  if (view.name === 'list') {
    return (
      <Box flexDirection="column">
        <StoryList
          feed={feed}
          onFeedChange={setFeed}
          onSelectStory={(story) => setView({ name: 'detail', story })}
        />
      </Box>
    );
  }

  if (view.name === 'detail') {
    return (
      <Box flexDirection="column">
        <StoryDetail
          story={view.story}
          onBack={() => setView({ name: 'list' })}
          onOpenComments={() => setView({ name: 'comments', story: view.story })}
        />
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Comments story={view.story} onBack={() => setView({ name: 'detail', story: view.story })} />
    </Box>
  );
}
