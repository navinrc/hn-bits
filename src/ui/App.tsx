import { useState, type JSX } from 'react';
import { Box, useApp, useInput } from 'ink';
import type { Feed, Story } from '../api/firebase.js';
import { StoryDetail } from './StoryDetail.js';
import { StoryList } from './StoryList.js';

type View = { name: 'list' } | { name: 'detail'; story: Story };

export function App(): JSX.Element {
  const [feed, setFeed] = useState<Feed>('top');
  const [view, setView] = useState<View>({ name: 'list' });
  const { exit } = useApp();

  useInput((input) => {
    if (input === 'q') exit();
  });

  return (
    <Box flexDirection="column">
      {view.name === 'list' ? (
        <StoryList
          feed={feed}
          onFeedChange={setFeed}
          onSelectStory={(story) => setView({ name: 'detail', story })}
        />
      ) : (
        <StoryDetail story={view.story} onBack={() => setView({ name: 'list' })} />
      )}
    </Box>
  );
}
