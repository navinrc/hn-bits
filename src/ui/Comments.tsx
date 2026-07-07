import { useEffect, useState, type JSX } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import { fetchComments, type CommentNode } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import { countDescendants, flattenSubtree } from '../lib/comments.js';
import { formatAge } from '../lib/format.js';
import { htmlToText } from '../lib/html.js';
import { clampSelection } from '../lib/listNavigation.js';

interface CommentsProps {
  story: Story;
  onBack: () => void;
}

type Status = 'loading' | 'ready' | 'error';
type Level = { name: 'top' } | { name: 'replies'; topIndex: number };

export function Comments({ story, onBack }: CommentsProps): JSX.Element {
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');
  const [comments, setComments] = useState<CommentNode[]>([]);
  const [level, setLevel] = useState<Level>({ name: 'top' });
  const [selectedTop, setSelectedTop] = useState(0);
  const [selectedReply, setSelectedReply] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setStatus('loading');
    try {
      setComments(await fetchComments(story.id));
      setStatus('ready');
    } catch (err) {
      setStatus('error');
      setError((err as Error).message);
    }
  }

  function openReplies() {
    if (!comments[selectedTop]) return;
    setSelectedReply(0);
    setLevel({ name: 'replies', topIndex: selectedTop });
  }

  function handleTopInput(input: string, key: Key) {
    if (key.escape || input === 'b') return onBack();
    if (input === 'j' || key.downArrow) return setSelectedTop((s) => clampSelection(s, 1, comments.length));
    if (input === 'k' || key.upArrow) return setSelectedTop((s) => clampSelection(s, -1, comments.length));
    if (key.return) return openReplies();
  }

  function handleReplyInput(input: string, key: Key, subtreeLength: number) {
    if (key.escape || input === 'b') return setLevel({ name: 'top' });
    if (input === 'j' || key.downArrow) return setSelectedReply((s) => clampSelection(s, 1, subtreeLength));
    if (input === 'k' || key.upArrow) return setSelectedReply((s) => clampSelection(s, -1, subtreeLength));
  }

  useInput((input, key) => {
    if (input === 'r' && status === 'error') return load();
    if (level.name === 'top') return handleTopInput(input, key);
    return handleReplyInput(input, key, flattenSubtree(comments[level.topIndex]).length);
  });

  if (status === 'loading') return <Text>loading…</Text>;
  if (status === 'error') return <Text color="red">{error} (r to retry)</Text>;
  if (level.name === 'replies') {
    return <ReplySubtree parent={comments[level.topIndex]} selected={selectedReply} />;
  }
  return <TopLevelComments story={story} comments={comments} selected={selectedTop} />;
}

interface TopLevelCommentsProps {
  story: Story;
  comments: CommentNode[];
  selected: number;
}

function TopLevelComments({ story, comments, selected }: TopLevelCommentsProps): JSX.Element {
  return (
    <Box flexDirection="column">
      <Text>
        {story.title} · {story.descendants} comments
      </Text>
      <Text> </Text>
      {comments.map((comment, index) => (
        <CommentBlock
          key={comment.id}
          comment={comment}
          replyCount={countDescendants(comment)}
          isSelected={index === selected}
        />
      ))}
      <Text dimColor>j/k move · enter replies · esc back · q quit</Text>
    </Box>
  );
}

interface CommentBlockProps {
  comment: CommentNode;
  replyCount: number;
  isSelected: boolean;
}

function CommentBlock({ comment, replyCount, isSelected }: CommentBlockProps): JSX.Element {
  const marker = isSelected ? '▸' : ' ';
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text inverse={isSelected}>
        {marker} {comment.author} · {formatAge(comment.time)} · {replyCount} replies
      </Text>
      <Text>{htmlToText(comment.text)}</Text>
    </Box>
  );
}

interface ReplySubtreeProps {
  parent: CommentNode;
  selected: number;
}

function ReplySubtree({ parent, selected }: ReplySubtreeProps): JSX.Element {
  const rows = flattenSubtree(parent);
  return (
    <Box flexDirection="column">
      {rows.map((row, index) => (
        <Box key={row.node.id} flexDirection="column" marginBottom={1} marginLeft={row.depth * 2}>
          <Text inverse={index === selected}>
            {index === selected ? '▸' : ' '} {row.node.author} · {formatAge(row.node.time)}
          </Text>
          <Text>{htmlToText(row.node.text)}</Text>
        </Box>
      ))}
      <Text dimColor>j/k move · esc back · q quit</Text>
    </Box>
  );
}
