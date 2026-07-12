import { useEffect, useRef, useState, type JSX } from 'react';
import { Box, Text, useInput, useWindowSize, type Key } from 'ink';
import open from 'open';
import { buildListSummaryPrompt } from '../ai/summaryPrompts.js';
import { searchStories } from '../api/algolia.js';
import { hnItemUrl, type Story } from '../api/firebase.js';
import { toggleBookmark } from '../db/bookmarks.js';
import type { Config } from '../lib/config.js';
import { clampSelection } from '../lib/listNavigation.js';
import { ensureVisibleLines, shouldFetchMore } from '../lib/viewport.js';
import { footerRows, SEARCH_RESULTS_KEYS } from './keymap.js';
import { HEADER_ROWS } from './Layout.js';
import { LoadingIndicator } from './LoadingIndicator.js';
import { STORY_ROW_HEIGHT } from './StoryRow.js';
import { StoryListView } from './StoryListView.js';
import { SummaryPanel } from './SummaryPanel.js';
import { theme } from './theme.js';
import { useFlash } from './useFlash.js';

const FETCH_THRESHOLD = 10;
const HEADER_LINES = 1;

interface SearchResultsProps {
  query: string;
  config: Config | null;
  onSelectStory: (story: Story) => void;
  onExit: () => void;
  onSearchAgain: () => void;
  onAskAI: (story: Story) => void;
}

type Status = 'loading' | 'ready' | 'error';

export function SearchResults({
  query,
  config,
  onSelectStory,
  onExit,
  onSearchAgain,
  onAskAI,
}: SearchResultsProps): JSX.Element {
  const { columns, rows } = useWindowSize();
  const bodyHeight = Math.max(1, rows - HEADER_ROWS - footerRows(SEARCH_RESULTS_KEYS, columns) - HEADER_LINES);

  const [stories, setStories] = useState<Story[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalHits, setTotalHits] = useState<number | null>(null);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [flashMessage, flash] = useFlash();
  const token = useRef(0);
  const nextPage = useRef(0);
  const topLineRef = useRef(0);

  useEffect(() => {
    void loadFirstPage();
  }, [query]);

  useEffect(() => {
    const totalCount = hasMore ? Infinity : stories.length;
    if (status === 'ready' && !loadingMore && shouldFetchMore(selected, stories.length, totalCount, FETCH_THRESHOLD)) {
      void loadMore();
    }
  }, [selected, stories.length, hasMore, status, loadingMore]);

  async function loadFirstPage(): Promise<void> {
    const myToken = ++token.current;
    nextPage.current = 0;
    setStatus('loading');
    setSelected(0);
    setStories([]);
    setTotalHits(null);
    try {
      const result = await searchStories(query, 0);
      if (myToken !== token.current) return;
      nextPage.current = 1;
      setStories(result.stories);
      setHasMore(result.hasMore);
      setTotalHits(result.totalHits);
      setStatus('ready');
    } catch (err) {
      if (myToken === token.current) failWith(err);
    }
  }

  async function loadMore(): Promise<void> {
    const myToken = token.current;
    const page = nextPage.current;
    setLoadingMore(true);
    try {
      const result = await searchStories(query, page);
      if (myToken !== token.current) return;
      nextPage.current = page + 1;
      setStories((prev) => [...prev, ...result.stories]);
      setHasMore(result.hasMore);
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
    if (input === '/') return onSearchAgain();
    if (key.escape) return onExit();
    if (input === 'j' || key.downArrow) return setSelected((s) => clampSelection(s, 1, stories.length));
    if (input === 'k' || key.upArrow) return setSelected((s) => clampSelection(s, -1, stories.length));
    if (input === 'G') return setSelected(Math.max(0, stories.length - 1));
    if (input === 'o') return openSelectedStory();
    if (input === 'r' && status === 'error') return void loadFirstPage();
    if (input === 's' && stories[selected]) return setSummaryOpen(true);
    if (input === 'a' && stories[selected]) return onAskAI(stories[selected]);
    if (input === 'B' && stories[selected]) return flash(toggleBookmark(stories[selected]) ? 'bookmarked ✓' : 'bookmark removed');
    if (key.return && stories[selected]) return onSelectStory(stories[selected]);
  }

  useInput(handleInput, { isActive: !summaryOpen });

  if (status === 'loading') return <LoadingIndicator label="Searching..." />;
  if (status === 'error') return <Text color={theme.colors.error}>{error} (r to retry)</Text>;

  const panelHeight = summaryOpen ? Math.max(6, Math.floor(bodyHeight / 2)) : 0;
  const statusLineHeight = loadingMore || flashMessage ? 1 : 0;
  const listHeight = Math.max(1, bodyHeight - statusLineHeight - panelHeight);
  const heights = stories.map(() => STORY_ROW_HEIGHT);
  const topLine = ensureVisibleLines(heights, selected, topLineRef.current, listHeight);
  topLineRef.current = topLine;
  const selectedStory = stories[selected];

  return (
    <Box flexDirection="column">
      <Text>
        search: {query}
        {totalHits !== null ? `    ${totalHits} results` : ''}
      </Text>
      <StoryListView stories={stories} selected={selected} topLine={topLine} height={listHeight} width={columns} />
      {flashMessage ? <Text dimColor>{flashMessage}</Text> : loadingMore && <Text dimColor>loading more…</Text>}
      {summaryOpen && selectedStory && (
        <SummaryPanel
          config={config}
          buildPrompt={(signal) => buildListSummaryPrompt(selectedStory, signal)}
          height={panelHeight}
          width={columns}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </Box>
  );
}
