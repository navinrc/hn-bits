import { type JSX } from 'react';
import { Box, Text, useInput } from 'ink';
import open from 'open';
import { hnItemUrl, type Story } from '../api/firebase.js';
import { formatAge } from '../lib/format.js';
import { getHostname } from '../lib/url.js';

interface StoryDetailProps {
  story: Story;
  onBack: () => void;
  onOpenComments: () => void;
}

export function StoryDetail({ story, onBack, onOpenComments }: StoryDetailProps): JSX.Element {
  const hostname = getHostname(story.url);

  useInput((input, key) => {
    if (key.escape || input === 'b') return onBack();
    if (input === 'o') return void open(story.url ?? hnItemUrl(story.id));
    if (key.return || input === 'c') return onOpenComments();
  });

  return (
    <Box flexDirection="column">
      <Text bold>{story.title}</Text>
      {hostname && <Text dimColor>{hostname}</Text>}
      <Text> </Text>
      <Text>
        {story.score} points · by {story.by} · {formatAge(story.time)} ago · {story.descendants} comments
      </Text>
      <Text dimColor>enter/c comments · o open in browser · esc back · q quit</Text>
    </Box>
  );
}
