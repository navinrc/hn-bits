import { useRef, useState, type JSX } from 'react';
import { Box, Text, useInput, useWindowSize, type Key } from 'ink';
import open from 'open';
import { buildListSummaryPrompt } from '../ai/summaryPrompts.js';
import { hnItemUrl, type Feed, type Story } from '../api/firebase.js';
import { listBookmarks, toggleBookmark } from '../db/bookmarks.js';
import type { Config } from '../lib/config.js';
import { clampSelection, mapFeedKey } from '../lib/listNavigation.js';
import { ensureVisibleLines } from '../lib/viewport.js';
import { footerRows, SAVED_KEYS } from './keymap.js';
import { HEADER_ROWS } from './Layout.js';
import { STORY_ROW_HEIGHT } from './StoryRow.js';
import { StoryListView } from './StoryListView.js';
import { SummaryPanel } from './SummaryPanel.js';
import { useFlash } from './useFlash.js';

interface SavedListProps {
  config: Config | null;
  onSelectStory: (story: Story) => void;
  onFeedChange: (feed: Feed) => void;
  onTabChange: (direction: 1 | -1) => void;
  onSearchRequested: () => void;
  onAskAI: (story: Story) => void;
}

export function SavedList({
  config,
  onSelectStory,
  onFeedChange,
  onTabChange,
  onSearchRequested,
  onAskAI,
}: SavedListProps): JSX.Element {
  const { columns, rows } = useWindowSize();
  const bodyHeight = Math.max(1, rows - HEADER_ROWS - footerRows(SAVED_KEYS, columns));

  const [stories, setStories] = useState<Story[]>(() => listBookmarks());
  const [selected, setSelected] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [flashMessage, flash] = useFlash();
  const pendingTopJump = useRef(false);
  const topLineRef = useRef(0);

  function reload(): void {
    const next = listBookmarks();
    setStories(next);
    setSelected((s) => clampSelection(s, 0, next.length));
  }

  function openSelectedStory(): void {
    const story = stories[selected];
    if (story) void open(story.url ?? hnItemUrl(story.id));
  }

  function removeSelectedBookmark(): void {
    const story = stories[selected];
    if (!story) return;
    toggleBookmark(story);
    flash('bookmark removed');
    reload();
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
    if (key.leftArrow) return onTabChange(-1);
    if (key.rightArrow) return onTabChange(1);
    if (input === '/') return onSearchRequested();
    if (input === 'j' || key.downArrow) return setSelected((s) => clampSelection(s, 1, stories.length));
    if (input === 'k' || key.upArrow) return setSelected((s) => clampSelection(s, -1, stories.length));
    if (input === 'G') return setSelected(Math.max(0, stories.length - 1));
    if (input === 'o') return openSelectedStory();
    if (input === 'r') return reload();
    if (input === 'B' && stories[selected]) return removeSelectedBookmark();
    if (input === 's' && stories[selected]) return setSummaryOpen(true);
    if (input === 'a' && stories[selected]) return onAskAI(stories[selected]);
    if (key.return && stories[selected]) return onSelectStory(stories[selected]);
  }

  useInput(handleInput, { isActive: !summaryOpen });

  const panelHeight = summaryOpen ? Math.max(6, Math.floor(bodyHeight / 2)) : 0;
  const statusLineHeight = flashMessage ? 1 : 0;
  const listHeight = Math.max(1, bodyHeight - statusLineHeight - panelHeight);
  const selectedStory = stories[selected];

  if (stories.length === 0) {
    return (
      <Box flexDirection="column">
        <Text dimColor>no bookmarks yet — press B on a story</Text>
        {flashMessage && <Text dimColor>{flashMessage}</Text>}
      </Box>
    );
  }

  const heights = stories.map(() => STORY_ROW_HEIGHT);
  const topLine = ensureVisibleLines(heights, selected, topLineRef.current, listHeight);
  topLineRef.current = topLine;

  return (
    <Box flexDirection="column">
      <StoryListView stories={stories} selected={selected} topLine={topLine} height={listHeight} width={columns} />
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
