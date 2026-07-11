import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { Box, Text, useInput, useWindowSize, type Key } from 'ink';
import open from 'open';
import { buildCommentsSummaryPrompt } from '../ai/summaryPrompts.js';
import { fetchComments, type CommentNode } from '../api/algolia.js';
import { hnItemUrl, type Story } from '../api/firebase.js';
import {
  collapseAll,
  flattenTree,
  headerOnlyAll,
  rehideRevealed,
  revealHeaderOnly,
  toggleFold,
  type FlatComment,
  type RevealState,
} from '../lib/commentTree.js';
import type { Config } from '../lib/config.js';
import { tokenizeContacts, type TextToken } from '../lib/contactHighlight.js';
import { formatAge } from '../lib/format.js';
import { htmlToText } from '../lib/html.js';
import { clampSelection } from '../lib/listNavigation.js';
import { ensureVisibleLines, sliceByLines, wrapPlainText } from '../lib/viewport.js';
import { COMMENTS_KEYS, footerRows } from './keymap.js';
import { HEADER_ROWS } from './Layout.js';
import { LoadingIndicator } from './LoadingIndicator.js';
import { SummaryPanel } from './SummaryPanel.js';
import { theme } from './theme.js';

const HEADER_BORDER_LINES = 2;
// borderStyle (2 cols) + paddingX (2 cols) eaten from the card's interior width.
const HEADER_FRAME_WIDTH = 4;
const ROW_BORDER_WIDTH = 2;
const SELECTION_BAR = '│';

// Long titles/URLs word-wrap inside the bordered card; undercounting that height
// shrinks the comment viewport too little and overflows the terminal (corrupts the frame).
export function commentsHeaderLines(story: Story, columns: number): number {
  const width = Math.max(1, columns - HEADER_FRAME_WIDTH);
  const titleLines = wrapPlainText(story.title, width).length;
  const urlLines = story.url ? wrapPlainText(story.url, width).length : 0;
  return HEADER_BORDER_LINES + titleLines + 1 + urlLines;
}

interface CommentsProps {
  story: Story;
  config: Config | null;
  onBack: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export function Comments({ story, config, onBack }: CommentsProps): JSX.Element {
  const { columns, rows } = useWindowSize();
  const headerLines = commentsHeaderLines(story, columns);
  const viewportLines = Math.max(1, rows - HEADER_ROWS - footerRows(COMMENTS_KEYS, columns) - headerLines);

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [fold, setFold] = useState<{ folded: ReadonlySet<number> } & RevealState>({
    folded: new Set(),
    headerOnly: new Set(),
    revealed: new Set(),
  });
  const [selected, setSelected] = useState(0);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const pendingTopJump = useRef(false);
  const topLineRef = useRef(0);
  const { folded, headerOnly, revealed } = fold;

  useEffect(() => {
    void load();
  }, []);

  async function load(): Promise<void> {
    setStatus('loading');
    try {
      const tree = await fetchComments(story.id);
      setComments(tree);
      setFold({ folded: collapseAll(tree), headerOnly: new Set(), revealed: new Set() });
      setSelected(0);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
  }

  const flat = useMemo(() => flattenTree(comments, folded, headerOnly), [comments, folded, headerOnly]);
  const rowsData = useMemo(() => flat.map((entry) => buildRow(entry, columns)), [flat, columns]);
  const clampedSelected = clampSelection(selected, 0, flat.length);

  function openStory(): void {
    void open(story.url ?? hnItemUrl(story.id));
  }

  function toggleSelected(): void {
    const row = flat[clampedSelected];
    if (!row) return;
    const id = row.node.id;
    if (row.headerOnly) {
      return setFold((f) => ({ ...f, ...revealHeaderOnly(f, id) }));
    }
    if (row.node.children.length === 0) {
      if (revealed.has(id)) setFold((f) => ({ ...f, ...rehideRevealed(f, id) }));
      return;
    }
    setFold((f) => ({ ...f, folded: toggleFold(f.folded, id) }));
  }

  function collapseEverything(): void {
    setFold((f) => ({ ...f, headerOnly: headerOnlyAll(comments), revealed: new Set() }));
  }

  function resetFold(): void {
    setFold({ folded: collapseAll(comments), headerOnly: new Set(), revealed: new Set() });
  }

  function handleInput(input: string, key: Key): void {
    const isG = input === 'g';
    if (isG && pendingTopJump.current) {
      pendingTopJump.current = false;
      return setSelected(0);
    }
    pendingTopJump.current = isG;

    if (key.escape || input === 'b') return onBack();
    if (input === 'j' || key.downArrow) return setSelected(clampSelection(clampedSelected, 1, flat.length));
    if (input === 'k' || key.upArrow) return setSelected(clampSelection(clampedSelected, -1, flat.length));
    if (input === 'G') return setSelected(Math.max(0, flat.length - 1));
    if (input === ' ' || key.return) return toggleSelected();
    if (input === 'C') return collapseEverything();
    if (input === 'E') return resetFold();
    if (input === 'o') return openStory();
    if (input === 'r') return void load();
    if (input === 's') return setSummaryOpen(true);
  }

  useInput(handleInput, { isActive: !summaryOpen });

  if (status === 'loading') return <LoadingIndicator label="Loading comments..." />;
  if (status === 'error') return <Text color={theme.colors.error}>{error} (r to retry)</Text>;

  const panelHeight = summaryOpen ? Math.max(6, Math.floor(viewportLines / 2)) : 0;
  const listViewportLines = Math.max(1, viewportLines - panelHeight);
  const heights = rowsData.map((row) => row.lines.length);
  const topLine = ensureVisibleLines(heights, clampedSelected, topLineRef.current, listViewportLines);
  topLineRef.current = topLine;
  const { first, last, clipTop, clipBottom } = sliceByLines(heights, topLine, listViewportLines);

  return (
    <Box flexDirection="column">
      <CommentsHeader story={story} />
      {flat.length === 0 && <Text dimColor>no comments yet</Text>}
      {rowsData.slice(first, last + 1).map((row, i) => {
        const rowIndex = first + i;
        const start = rowIndex === first ? clipTop : 0;
        const end = rowIndex === last ? row.lines.length - clipBottom : row.lines.length;
        return (
          <CommentRowView
            key={row.id}
            depth={row.depth}
            width={row.width}
            lines={row.lines.slice(start, end)}
            isSelected={rowIndex === clampedSelected}
          />
        );
      })}
      {summaryOpen && (
        <SummaryPanel
          config={config}
          buildPrompt={() => Promise.resolve(buildCommentsSummaryPrompt(story, comments))}
          height={panelHeight}
          width={columns}
          onClose={() => setSummaryOpen(false)}
        />
      )}
    </Box>
  );
}

interface CommentsHeaderProps {
  story: Story;
}

function CommentsHeader({ story }: CommentsHeaderProps): JSX.Element {
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={theme.colors.accent} paddingX={1}>
      <Text bold color={theme.colors.title}>
        {story.title}
      </Text>
      <Text dimColor>
        {theme.glyphs.upvote} {story.score} points by {story.by} {formatAge(story.time)} | {story.descendants}{' '}
        comments
      </Text>
      {story.url && <Text color={theme.colors.accent}>{story.url}</Text>}
    </Box>
  );
}

interface Span {
  text: string;
  color?: string;
  bold?: boolean;
  underline?: boolean;
}

type RenderLine = { kind: 'header'; spans: Span[] } | { kind: 'body'; spans: Span[] };

interface CommentRow {
  id: number;
  depth: number;
  width: number;
  lines: RenderLine[];
}

function replyBadge(entry: FlatComment): string {
  if (entry.descendantCount === 0) return '';
  if (entry.headerOnly) return `[${entry.descendantCount} more]`;
  return entry.descendantCount === 1 ? '1 reply' : `${entry.descendantCount} replies`;
}

function buildHeaderSpans(entry: FlatComment): Span[] {
  const glyph = entry.headerOnly ? theme.glyphs.foldClosed : theme.glyphs.foldOpen;
  const badge = replyBadge(entry);
  const spans: Span[] = [
    { text: `${glyph} `, color: theme.colors.accent },
    { text: entry.node.author, color: theme.colors.accent, bold: true },
    { text: ` · ${formatAge(entry.node.time)}`, color: theme.colors.muted },
  ];
  if (badge) spans.push({ text: ` | ${badge}`, color: theme.colors.muted });
  return spans;
}

function tokenToSpan(token: TextToken): Span {
  if (token.kind === 'link') return { text: token.text, color: theme.colors.link, underline: true };
  if (token.kind === 'email') return { text: token.text, color: theme.colors.email, bold: true };
  return { text: token.text };
}

function buildRow(entry: FlatComment, columns: number): CommentRow {
  // Reserve 2 columns for the selection bar so wrapping doesn't shift when selection moves,
  // plus 1 trailing column: a line that exactly fills the terminal width triggers a VT100
  // delayed-wrap that drops the selection bar/stripe from the following line.
  const width = Math.max(1, columns - 1 - entry.depth * 2 - ROW_BORDER_WIDTH);
  const header: RenderLine = { kind: 'header', spans: buildHeaderSpans(entry) };
  const body: RenderLine[] = entry.headerOnly
    ? []
    : wrapPlainText(htmlToText(entry.node.text), width).map((line) => ({
        kind: 'body',
        spans: tokenizeContacts(line).map(tokenToSpan),
      }));
  return { id: entry.node.id, depth: entry.depth, width, lines: [header, ...body] };
}

function spanLength(spans: Span[]): number {
  return spans.reduce((sum, span) => sum + span.text.length, 0);
}

interface CommentRowViewProps {
  depth: number;
  width: number;
  lines: RenderLine[];
  isSelected: boolean;
}

function CommentRowView({ depth, width, lines, isSelected }: CommentRowViewProps): JSX.Element {
  const background = isSelected ? theme.colors.selectionBackground : undefined;
  const prefix = isSelected ? `${SELECTION_BAR} ` : '  ';
  const rowWidth = width + ROW_BORDER_WIDTH;

  return (
    <Box marginLeft={depth * 2} flexDirection="column">
      {lines.map((line, i) => {
        const spans: Span[] = [
          { text: prefix, color: isSelected ? theme.colors.accent : undefined },
          ...line.spans,
        ];
        if (isSelected) spans.push({ text: ' '.repeat(Math.max(0, rowWidth - spanLength(spans))) });
        return (
          <Text key={i} backgroundColor={background} wrap="truncate-end">
            {spans.map((span, j) => (
              <Text key={j} color={span.color} bold={span.bold} underline={span.underline}>
                {span.text}
              </Text>
            ))}
          </Text>
        );
      })}
    </Box>
  );
}
