import { useRef, useState, type JSX } from 'react';
import { Box, Text, useInput, useWindowSize, type Key } from 'ink';
import type { Feed } from '../api/firebase.js';
import { listSubscriptions, removeSubscription, type Subscription } from '../db/subscriptions.js';
import { formatAge } from '../lib/format.js';
import { clampSelection, mapFeedKey } from '../lib/listNavigation.js';
import { ensureVisibleLines, sliceByLines } from '../lib/viewport.js';
import { footerRows, SUBS_KEYS } from './keymap.js';
import { HEADER_ROWS } from './Layout.js';
import { theme } from './theme.js';

interface SubscriptionsViewProps {
  onSelectMatches: (subscription: Subscription) => void;
  onAdd: () => void;
  onEdit: (subscription: Subscription) => void;
  onFeedChange: (feed: Feed) => void;
  onTabChange: (direction: 1 | -1) => void;
}

function pointsLabel(minPoints: number): string {
  return minPoints === 0 ? 'any' : `≥${minPoints} pts`;
}

export function SubscriptionsView({
  onSelectMatches,
  onAdd,
  onEdit,
  onFeedChange,
  onTabChange,
}: SubscriptionsViewProps): JSX.Element {
  const { columns, rows } = useWindowSize();
  const bodyHeight = Math.max(1, rows - HEADER_ROWS - footerRows(SUBS_KEYS, columns));

  const [subs, setSubs] = useState<Subscription[]>(() => listSubscriptions());
  const [selected, setSelected] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const pendingTopJump = useRef(false);
  const topLineRef = useRef(0);

  function reload(): void {
    const next = listSubscriptions();
    setSubs(next);
    setSelected((s) => clampSelection(s, 0, next.length));
  }

  function handleInput(input: string, key: Key): void {
    if (deleteConfirm) {
      if (input === 'y') {
        removeSubscription(deleteConfirm);
        reload();
      }
      setDeleteConfirm(null);
      return;
    }

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
    if (input === 'j' || key.downArrow) return setSelected((s) => clampSelection(s, 1, subs.length));
    if (input === 'k' || key.upArrow) return setSelected((s) => clampSelection(s, -1, subs.length));
    if (input === 'G') return setSelected(Math.max(0, subs.length - 1));
    if (key.return && subs[selected]) return onSelectMatches(subs[selected]);
    if (input === 'a') return onAdd();
    if (input === 'e' && subs[selected]) return onEdit(subs[selected]);
    if (input === 'd' && subs[selected]) return setDeleteConfirm(subs[selected].name);
  }

  useInput(handleInput);

  if (subs.length === 0) {
    return <Text dimColor>no subscriptions yet - press a to add</Text>;
  }

  const statusLineHeight = deleteConfirm ? 1 : 0;
  const listHeight = Math.max(1, bodyHeight - statusLineHeight);
  const heights = subs.map(() => 1);
  const topLine = ensureVisibleLines(heights, selected, topLineRef.current, listHeight);
  topLineRef.current = topLine;
  const { first, last } = sliceByLines(heights, topLine, listHeight);
  const nameWidth = Math.max(...subs.map((s) => s.name.length));

  return (
    <Box flexDirection="column">
      {subs.slice(first, last + 1).map((sub, i) => {
        const index = first + i;
        const isSelected = index === selected;
        const marker = isSelected ? theme.glyphs.selection : ' ';
        const background = isSelected ? theme.colors.selectionBackground : undefined;
        return (
          <Text key={sub.id} backgroundColor={background}>
            {marker} {sub.name.padEnd(nameWidth)}  "{sub.query}"  {pointsLabel(sub.minPoints).padEnd(9)}  added{' '}
            {formatAge(sub.createdAt)} ago
          </Text>
        );
      })}
      {deleteConfirm && <Text dimColor>delete '{deleteConfirm}'? y/n</Text>}
    </Box>
  );
}
