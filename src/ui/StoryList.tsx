import { useEffect, useState, type JSX } from 'react';
import { Box, Text, useInput } from 'ink';
import open from 'open';
import { fetchStories, fetchStoryIds, hnItemUrl, type Feed, type Story } from '../api/firebase.js';
import { formatAge } from '../lib/format.js';
import { PAGE_SIZE, clampSelection, mapFeedKey, pageSlice, totalPages } from '../lib/listNavigation.js';

interface StoryListProps {
  feed: Feed;
  onFeedChange: (feed: Feed) => void;
}

type Status = 'loading' | 'ready' | 'error';

export function StoryList({ feed, onFeedChange }: StoryListProps): JSX.Element {
  const [storyIds, setStoryIds] = useState<number[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    loadStoryIds();
  }, [feed]);

  useEffect(() => {
    if (storyIds.length > 0) loadPage();
  }, [storyIds, page]);

  async function loadStoryIds() {
    setStatus('loading');
    setPage(0);
    try {
      setStoryIds(await fetchStoryIds(feed));
    } catch (err) {
      failWith(err);
    }
  }

  async function loadPage() {
    setStatus('loading');
    try {
      setStories(await fetchStories(pageSlice(storyIds, page, PAGE_SIZE)));
      setSelected(0);
      setStatus('ready');
    } catch (err) {
      failWith(err);
    }
  }

  function failWith(err: unknown) {
    setStatus('error');
    setError((err as Error).message);
  }

  function openSelectedStory() {
    const story = stories[selected];
    if (story) void open(story.url ?? hnItemUrl(story.id));
  }

  useInput((input, key) => {
    const nextFeed = mapFeedKey(input);
    if (nextFeed) return onFeedChange(nextFeed);
    if (input === 'j' || key.downArrow) return setSelected((s) => clampSelection(s, 1, stories.length));
    if (input === 'k' || key.upArrow) return setSelected((s) => clampSelection(s, -1, stories.length));
    if (input === 'o') return openSelectedStory();
    if (input === ']') return setPage((p) => Math.min(p + 1, totalPages(storyIds.length) - 1));
    if (input === '[') return setPage((p) => Math.max(p - 1, 0));
    if (input === 'r' && status === 'error') return loadStoryIds();
    // enter: StoryDetail doesn't exist yet (tracer bullet scope) — intentional no-op
  });

  if (status === 'loading') return <Text>loading…</Text>;
  if (status === 'error') return <Text color="red">{error} (r to retry)</Text>;

  return (
    <Box flexDirection="column">
      <Text>
        hn-bits · {feed}    page {page + 1}
      </Text>
      {stories.map((story, index) => (
        <StoryRow
          key={story.id}
          story={story}
          rank={page * PAGE_SIZE + index + 1}
          isSelected={index === selected}
        />
      ))}
      <Text dimColor>j/k move · enter open · o browser · t/n/b feed · ]/[ page · q quit</Text>
    </Box>
  );
}

interface StoryRowProps {
  story: Story;
  rank: number;
  isSelected: boolean;
}

function StoryRow({ story, rank, isSelected }: StoryRowProps): JSX.Element {
  const marker = isSelected ? '▸' : ' ';
  return (
    <Text inverse={isSelected}>
      {marker} {rank}. {story.title}  {story.score}⯅ {story.descendants}💬 {formatAge(story.time)}  {story.by}
    </Text>
  );
}
