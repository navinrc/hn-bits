import { useEffect, useRef, useState, type JSX } from 'react';
import { Box, Text, useInput, useWindowSize, type Key } from 'ink';
import open from 'open';
import { buildListSummaryPrompt } from '../ai/summaryPrompts.js';
import { searchRecent } from '../api/algolia.js';
import { hnItemUrl, type Story } from '../api/firebase.js';
import { toggleBookmark } from '../db/bookmarks.js';
import type { Subscription } from '../db/subscriptions.js';
import type { Config } from '../lib/config.js';
import { clampSelection } from '../lib/listNavigation.js';
import { ensureVisibleLines } from '../lib/viewport.js';
import { footerRows, SUB_MATCHES_KEYS } from './keymap.js';
import { HEADER_ROWS } from './Layout.js';
import { LoadingIndicator } from './LoadingIndicator.js';
import { STORY_ROW_HEIGHT } from './StoryRow.js';
import { StoryListView } from './StoryListView.js';
import { SummaryPanel } from './SummaryPanel.js';
import { theme } from './theme.js';
import { useFlash } from './useFlash.js';

const WINDOW_DAYS = 7;
const HEADER_LINES = 1;

interface SubscriptionMatchesProps {
  subscription: Subscription;
  config: Config | null;
  onSelectStory: (story: Story) => void;
  onBack: () => void;
  onAskAI: (story: Story) => void;
}

type Status = 'loading' | 'ready' | 'error';

function windowStart(): number {
  return Math.floor(Date.now() / 1000) - WINDOW_DAYS * 24 * 60 * 60;
}

export function SubscriptionMatches({
  subscription,
  config,
  onSelectStory,
  onBack,
  onAskAI,
}: SubscriptionMatchesProps): JSX.Element {
  const { columns, rows } = useWindowSize();
  const bodyHeight = Math.max(1, rows - HEADER_ROWS - footerRows(SUB_MATCHES_KEYS, columns) - HEADER_LINES);

  const [stories, setStories] = useState<Story[]>([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [flashMessage, flash] = useFlash();
  const pendingTopJump = useRef(false);
  const topLineRef = useRef(0);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscription.id]);

  async function load(): Promise<void> {
    setStatus('loading');
    setSelected(0);
    try {
      const results = await searchRecent(subscription.query, {
        createdAfter: windowStart(),
        minPoints: subscription.minPoints,
        minComments: subscription.minComments,
      });
      setStories(results);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
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

    if (key.escape) return onBack();
    if (input === 'j' || key.downArrow) return setSelected((s) => clampSelection(s, 1, stories.length));
    if (input === 'k' || key.upArrow) return setSelected((s) => clampSelection(s, -1, stories.length));
    if (input === 'G') return setSelected(Math.max(0, stories.length - 1));
    if (input === 'o') return openSelectedStory();
    if (input === 'r') return void load();
    if (input === 's' && stories[selected]) return setSummaryOpen(true);
    if (input === 'a' && stories[selected]) return onAskAI(stories[selected]);
    if (input === 'B' && stories[selected]) {
      return flash(toggleBookmark(stories[selected]) ? 'bookmarked ✓' : 'bookmark removed');
    }
    if (key.return && stories[selected]) return onSelectStory(stories[selected]);
  }

  useInput(handleInput, { isActive: !summaryOpen });

  if (status === 'loading') return <LoadingIndicator label="Loading matches..." />;
  if (status === 'error') return <Text color={theme.colors.error}>{error} (r to retry)</Text>;

  const panelHeight = summaryOpen ? Math.max(6, Math.floor(bodyHeight / 2)) : 0;
  const statusLineHeight = flashMessage ? 1 : 0;
  const listHeight = Math.max(1, bodyHeight - statusLineHeight - panelHeight);
  const heights = stories.map(() => STORY_ROW_HEIGHT);
  const topLine = ensureVisibleLines(heights, selected, topLineRef.current, listHeight);
  topLineRef.current = topLine;
  const selectedStory = stories[selected];

  return (
    <Box flexDirection="column">
      <Text>
        sub: {subscription.name} "{subscription.query}"
      </Text>
      {stories.length === 0 ? (
        <Text dimColor>no matches in the last 7 days</Text>
      ) : (
        <StoryListView stories={stories} selected={selected} topLine={topLine} height={listHeight} width={columns} />
      )}
      {flashMessage && <Text dimColor>{flashMessage}</Text>}
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
