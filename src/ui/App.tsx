import { useState, type JSX } from 'react';
import { Box, useApp, useInput } from 'ink';
import type { Feed } from '../api/firebase.js';
import { StoryList } from './StoryList.js';

export function App(): JSX.Element {
  const [feed, setFeed] = useState<Feed>('top');
  const { exit } = useApp();

  useInput((input) => {
    if (input === 'q') exit();
  });

  return (
    <Box flexDirection="column">
      <StoryList feed={feed} onFeedChange={setFeed} />
    </Box>
  );
}
