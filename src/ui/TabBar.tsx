import { type JSX } from 'react';
import { Box, Text } from 'ink';
import type { Feed } from '../api/firebase.js';
import { theme } from './theme.js';

interface TabBarProps {
  active: Feed;
}

const TABS: { feed: Feed; label: string }[] = [
  { feed: 'top', label: 'Top' },
  { feed: 'new', label: 'New' },
  { feed: 'best', label: 'Best' },
  { feed: 'ask', label: 'Ask' },
  { feed: 'show', label: 'Show' },
];

export function TabBar({ active }: TabBarProps): JSX.Element {
  return (
    <Box>
      {TABS.map((tab, index) => (
        <Box key={tab.feed}>
          {index > 0 && <Text dimColor> │ </Text>}
          <Text color={theme.colors.accent} inverse={tab.feed === active} bold={tab.feed === active}>
            {tab.label}
          </Text>
        </Box>
      ))}
    </Box>
  );
}
