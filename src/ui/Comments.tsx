import { useEffect, useMemo, useRef, useState, type JSX } from 'react';
import { Box, Text, useInput, useWindowSize, type Key } from 'ink';
import open from 'open';
import { fetchComments, type CommentNode } from '../api/algolia.js';
import { hnItemUrl, type Story } from '../api/firebase.js';
import { collapseAll, expandAll, flattenTree, toggleFold, type FlatComment } from '../lib/commentTree.js';
import { formatAge } from '../lib/format.js';
import { htmlToText } from '../lib/html.js';
import { clampSelection } from '../lib/listNavigation.js';
import { getHostname } from '../lib/url.js';
import { ensureVisibleLines, sliceByLines, wrapPlainText } from '../lib/viewport.js';
import { FOOTER_ROWS, HEADER_ROWS } from './Layout.js';
import { theme } from './theme.js';

const HEADER_LINES = 2;

interface CommentsProps {
  story: Story;
  onBack: () => void;
}

type Status = 'loading' | 'ready' | 'error';

export function Comments({ story, onBack }: CommentsProps): JSX.Element {
  const { columns, rows } = useWindowSize();
  const viewportLines = Math.max(1, rows - HEADER_ROWS - FOOTER_ROWS - HEADER_LINES);

  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [folded, setFolded] = useState<ReadonlySet<number>>(new Set());
  const [selected, setSelected] = useState(0);
  const pendingTopJump = useRef(false);
  const topLineRef = useRef(0);

  useEffect(() => {
    void load();
  }, []);

  async function load(): Promise<void> {
    setStatus('loading');
    try {
      const tree = await fetchComments(story.id);
      setComments(tree);
      setFolded(new Set());
      setSelected(0);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
  }

  const flat = useMemo(() => flattenTree(comments, folded), [comments, folded]);
  const rowsData = useMemo(() => flat.map((entry) => buildRow(entry, columns)), [flat, columns]);
  const clampedSelected = clampSelection(selected, 0, flat.length);

  function openStory(): void {
    void open(story.url ?? hnItemUrl(story.id));
  }

  function toggleSelected(): void {
    const row = flat[clampedSelected];
    if (!row || row.node.children.length === 0) return;
    setFolded((f) => toggleFold(f, row.node.id));
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
    if (input === 'C') return setFolded(collapseAll(comments));
    if (input === 'E') return setFolded(expandAll());
    if (input === 'o') return openStory();
    if (input === 'r') return void load();
  }

  useInput(handleInput);

  if (status === 'loading') return <Text>loading…</Text>;
  if (status === 'error') return <Text color={theme.colors.error}>{error} (r to retry)</Text>;

  const heights = rowsData.map((row) => row.lines.length);
  const topLine = ensureVisibleLines(heights, clampedSelected, topLineRef.current, viewportLines);
  topLineRef.current = topLine;
  const { first, last, clipTop, clipBottom } = sliceByLines(heights, topLine, viewportLines);

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
            lines={row.lines.slice(start, end)}
            isSelected={rowIndex === clampedSelected}
          />
        );
      })}
    </Box>
  );
}

interface CommentsHeaderProps {
  story: Story;
}

function CommentsHeader({ story }: CommentsHeaderProps): JSX.Element {
  const hostname = getHostname(story.url);
  return (
    <Box flexDirection="column">
      <Text color={theme.colors.title}>
        {story.title}
        {hostname ? ` (${hostname})` : ''}
      </Text>
      <Text dimColor>
        {story.score} points · by {story.by} · {formatAge(story.time)} ago · {story.descendants} comments
      </Text>
    </Box>
  );
}

interface RowLine {
  text: string;
  isHeader: boolean;
}

interface CommentRow {
  id: number;
  depth: number;
  lines: RowLine[];
}

function buildRow(entry: FlatComment, columns: number): CommentRow {
  const glyph = entry.isFolded ? theme.glyphs.foldClosed : theme.glyphs.foldOpen;
  const count = entry.isFolded && entry.descendantCount > 0 ? ` (+${entry.descendantCount})` : '';
  const header: RowLine = {
    text: `${glyph} ${entry.node.author} · ${formatAge(entry.node.time)} ago${count}`,
    isHeader: true,
  };
  if (entry.isFolded) return { id: entry.node.id, depth: entry.depth, lines: [header] };

  const width = Math.max(1, columns - entry.depth * 2);
  const body = wrapPlainText(htmlToText(entry.node.text), width).map((text) => ({ text, isHeader: false }));
  return { id: entry.node.id, depth: entry.depth, lines: [header, ...body] };
}

interface CommentRowViewProps {
  depth: number;
  lines: RowLine[];
  isSelected: boolean;
}

function CommentRowView({ depth, lines, isSelected }: CommentRowViewProps): JSX.Element {
  return (
    <Box flexDirection="column" marginLeft={depth * 2}>
      {lines.map((line, i) => (
        <Text key={i} inverse={line.isHeader && isSelected} wrap="truncate-end">
          {line.text}
        </Text>
      ))}
    </Box>
  );
}
