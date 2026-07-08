import { useEffect, useRef, useState, type JSX } from 'react';
import { Box, Text, useInput, useWindowSize, type Key } from 'ink';
import open from 'open';
import { fetchStories, fetchStoryIds, hnItemUrl, type Feed, type Story } from '../api/firebase.js';
import { clampSelection, mapFeedKey, nextFeed, previousFeed } from '../lib/listNavigation.js';
import { ensureVisible, shouldFetchMore } from '../lib/viewport.js';
import { FOOTER_ROWS, HEADER_ROWS } from './Layout.js';
import { StoryListView } from './StoryListView.js';

const BATCH_SIZE = 30;
const FETCH_THRESHOLD = 10;

interface StoryListProps {
  feed: Feed;
  onFeedChange: (feed: Feed) => void;
  onSelectStory: (story: Story) => void;
  onSearchRequested: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export function StoryList({ feed, onFeedChange, onSelectStory, onSearchRequested }: StoryListProps): JSX.Element {
  const { columns, rows } = useWindowSize();
  const bodyHeight = Math.max(1, rows - HEADER_ROWS - FOOTER_ROWS);

  const [storyIds, setStoryIds] = useState<number[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const token = useRef(0);
  const pendingTopJump = useRef(false);
  const offsetRef = useRef(0);

  useEffect(() => {
    void loadFeed();
  }, [feed]);

  useEffect(() => {
    if (status === 'ready' && !loadingMore && shouldFetchMore(selected, stories.length, storyIds.length, FETCH_THRESHOLD)) {
      void loadMore();
    }
  }, [selected, stories.length, storyIds.length, status, loadingMore]);

  async function loadFeed(): Promise<void> {
    const myToken = ++token.current;
    setStatus('loading');
    setSelected(0);
    setStories([]);
    try {
      const ids = await fetchStoryIds(feed);
      if (myToken !== token.current) return;
      setStoryIds(ids);
      const firstBatch = await fetchStories(ids.slice(0, BATCH_SIZE));
      if (myToken !== token.current) return;
      setStories(firstBatch);
      setStatus('ready');
    } catch (err) {
      if (myToken === token.current) failWith(err);
    }
  }

  async function loadMore(): Promise<void> {
    const myToken = token.current;
    const alreadyFetched = stories.length;
    setLoadingMore(true);
    try {
      const nextIds = storyIds.slice(alreadyFetched, alreadyFetched + BATCH_SIZE);
      const more = await fetchStories(nextIds);
      if (myToken !== token.current) return;
      setStories((prev) => [...prev, ...more]);
    } catch (err) {
      if (myToken === token.current) failWith(err);
    } finally {
      if (myToken === token.current) setLoadingMore(false);
    }
  }

  function failWith(err: unknown): void {
    setStatus('error');
    setError((err as Error).message);
  }

  function openSelectedStory(): void {
    const story = stories[selected];
    if (story) void open(story.url ?? hnItemUrl(story.id));
  }

  function handleInput(input: string, key: Key): void {
    const isG = input === 'g';
    if (isG && pendingTopJump.current) {
      pendingTopJump.current = false;
      return setSelected(0);
    }
    pendingTopJump.current = isG;

    const targetFeed = mapFeedKey(input);
    if (targetFeed) return onFeedChange(targetFeed);
    if (key.leftArrow) return onFeedChange(previousFeed(feed));
    if (key.rightArrow) return onFeedChange(nextFeed(feed));
    if (input === '/') return onSearchRequested();
    if (input === 'j' || key.downArrow) return setSelected((s) => clampSelection(s, 1, stories.length));
    if (input === 'k' || key.upArrow) return setSelected((s) => clampSelection(s, -1, stories.length));
    if (input === 'G') return setSelected(Math.max(0, stories.length - 1));
    if (input === 'o') return openSelectedStory();
    if (input === 'r') return void loadFeed();
    if (key.return && stories[selected]) return onSelectStory(stories[selected]);
  }

  useInput(handleInput);

  if (status === 'loading') return <Text>loading…</Text>;
  if (status === 'error') return <Text color="red">{error} (r to retry)</Text>;

  const listHeight = loadingMore ? Math.max(1, bodyHeight - 1) : bodyHeight;
  const offset = ensureVisible(offsetRef.current, selected, listHeight, stories.length);
  offsetRef.current = offset;

  return (
    <Box flexDirection="column">
      <StoryListView stories={stories} selected={selected} offset={offset} height={listHeight} width={columns} />
      {loadingMore && <Text dimColor>loading more…</Text>}
    </Box>
  );
}
