import { useEffect, useState, type JSX } from 'react';
import { Box, Text, useInput } from 'ink';
import open from 'open';
import { searchStories } from '../api/algolia.js';
import { hnItemUrl, type Story } from '../api/firebase.js';
import { PAGE_SIZE, clampSelection } from '../lib/listNavigation.js';
import { StoryRow } from './StoryRow.js';

interface SearchResultsProps {
  query: string;
  from: 'tui' | 'cli';
  onSelectStory: (story: Story) => void;
  onExit: () => void;
  onSearchAgain: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export function SearchResults({
  query,
  from,
  onSelectStory,
  onExit,
  onSearchAgain,
}: SearchResultsProps): JSX.Element {
  const [page, setPage] = useState(0);
  const [stories, setStories] = useState<Story[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    load();
  }, [query, page]);

  async function load() {
    setStatus('loading');
    try {
      const result = await searchStories(query, page);
      setStories(result.stories);
      setHasMore(result.hasMore);
      setSelected(0);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
  }

  function openSelectedStory() {
    const story = stories[selected];
    if (story) void open(story.url ?? hnItemUrl(story.id));
  }

  useInput((input, key) => {
    if (input === '/') return onSearchAgain();
    if (key.escape) return onExit();
    if (input === 'j' || key.downArrow) return setSelected((s) => clampSelection(s, 1, stories.length));
    if (input === 'k' || key.upArrow) return setSelected((s) => clampSelection(s, -1, stories.length));
    if (input === 'o') return openSelectedStory();
    if (input === ']' && hasMore) return setPage((p) => p + 1);
    if (input === '[') return setPage((p) => Math.max(p - 1, 0));
    if (input === 'r' && status === 'error') return load();
    if (key.return && stories[selected]) return onSelectStory(stories[selected]);
  });

  if (status === 'loading') return <Text>loading…</Text>;
  if (status === 'error') return <Text color="red">{error} (r to retry)</Text>;

  return (
    <Box flexDirection="column">
      <Text>
        search: {query}    page {page + 1}
      </Text>
      {stories.map((story, index) => (
        <StoryRow
          key={story.id}
          story={story}
          rank={page * PAGE_SIZE + index + 1}
          isSelected={index === selected}
        />
      ))}
      <Text dimColor>
        j/k move · enter details · o browser · ]/[ page · / new search · esc {from === 'tui' ? 'back' : 'quit'}{' '}
        · q quit
      </Text>
    </Box>
  );
}
