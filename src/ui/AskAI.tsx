import { useEffect, useRef, useState, type JSX } from 'react';
import { Box, Text, useInput, useWindowSize } from 'ink';
import { buildAskAIContext } from '../ai/context.js';
import { chatStream, checkOllama, describeError, type ChatMessage } from '../ai/ollama.js';
import { fetchComments, type CommentNode } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import { ExtractionError, extractArticle } from '../lib/article.js';
import { AI_SETUP_HINT_LINES, type Config } from '../lib/config.js';
import { truncateTitle } from '../lib/format.js';
import { htmlToText } from '../lib/html.js';
import { wrapPlainText } from '../lib/viewport.js';
import { HEADER_ROWS } from './Layout.js';
import { theme } from './theme.js';

interface AskAIProps {
  story: Story;
  comments: CommentNode[] | null;
  config: Config | null;
  onBack: () => void;
}

interface Turn {
  role: 'user' | 'assistant';
  content: string;
  cancelled?: boolean;
}

type Status = 'hint' | 'preparing' | 'unavailable' | 'idle' | 'streaming';

async function resolveArticle(story: Story): Promise<{ article: { text: string } | null; reason?: string }> {
  if (story.url) {
    try {
      return { article: await extractArticle(story.url) };
    } catch (err) {
      return { article: null, reason: err instanceof ExtractionError ? err.reason : 'unknown' };
    }
  }
  if (story.text) return { article: { text: htmlToText(story.text) } };
  return { article: null, reason: 'text post' };
}

export function AskAI({ story, comments, config, onBack }: AskAIProps): JSX.Element {
  const { columns, rows } = useWindowSize();
  const [status, setStatus] = useState<Status>(config ? 'preparing' : 'hint');
  const [unavailableDetail, setUnavailableDetail] = useState('');
  const [systemContext, setSystemContext] = useState('');
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const token = useRef(0);

  useEffect(() => {
    if (config) void prepare(config);
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function prepare(cfg: Config): Promise<void> {
    const myToken = ++token.current;
    setStatus('preparing');

    const health = await checkOllama(cfg.ollama);
    if (myToken !== token.current) return;
    if (!health.ok) {
      setUnavailableDetail(health.detail);
      setStatus('unavailable');
      return;
    }

    const { article, reason } = await resolveArticle(story);
    if (myToken !== token.current) return;

    let thread = comments;
    if (thread == null) {
      try {
        thread = await fetchComments(story.id);
      } catch {
        thread = [];
      }
    }
    if (myToken !== token.current) return;

    setSystemContext(buildAskAIContext({ story, article, articleUnavailableReason: reason, comments: thread }));
    setStatus('idle');
  }

  async function send(): Promise<void> {
    const text = input.trim();
    if (!config || !text) return;
    setInput('');
    setScrollOffset(0);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemContext },
      ...history.map((turn) => ({ role: turn.role, content: turn.content }) satisfies ChatMessage),
      { role: 'user', content: text },
    ];
    setHistory((h) => [...h, { role: 'user', content: text }, { role: 'assistant', content: '' }]);
    setStatus('streaming');

    const controller = new AbortController();
    controllerRef.current = controller;
    const myToken = ++token.current;

    function replaceLastAssistant(update: (turn: Turn) => Turn): void {
      setHistory((h) => {
        const copy = h.slice();
        const last = copy[copy.length - 1];
        if (last) copy[copy.length - 1] = update(last);
        return copy;
      });
    }

    try {
      let content = '';
      for await (const delta of chatStream(config.ollama, messages, controller.signal)) {
        if (myToken !== token.current) return;
        content += delta;
        replaceLastAssistant((turn) => ({ ...turn, content }));
      }
      if (myToken === token.current) setStatus('idle');
    } catch (err) {
      if (myToken !== token.current) return;
      replaceLastAssistant((turn) => ({ ...turn, content: describeError(err) }));
      setStatus('idle');
    }
  }

  function abortStreaming(): void {
    controllerRef.current?.abort();
    token.current++;
    setHistory((h) => {
      const copy = h.slice();
      const last = copy[copy.length - 1];
      if (last?.role === 'assistant') copy[copy.length - 1] = { ...last, cancelled: true };
      return copy;
    });
    setStatus('idle');
  }

  useInput((rawInput, key) => {
    if (status === 'streaming') {
      if (key.escape) abortStreaming();
      return;
    }
    if (key.escape) return onBack();
    if (status !== 'idle') return;
    if (key.return) return void send();
    if (input === '' && key.upArrow) return setScrollOffset((s) => s + 1);
    if (input === '' && key.downArrow) return setScrollOffset((s) => Math.max(0, s - 1));
    if (key.backspace || key.delete) return setInput((v) => v.slice(0, -1));
    if (rawInput && !key.ctrl && !key.meta) setInput((v) => v + rawInput);
  });

  const width = columns;
  const headerRows = 2; // title line + blank
  const dividerRows = 2; // blank + rule
  const inputRows = 1;
  const footerRows = 1;
  // App's Footer box renders one more (empty) row below this view's own box — see App.tsx renderFooter.
  const appFooterRows = 1;
  const boxHeight = Math.max(1, rows - HEADER_ROWS - appFooterRows);
  const historyRows = Math.max(1, boxHeight - headerRows - dividerRows - inputRows - footerRows);

  const headerSuffix = status === 'preparing' ? ' · preparing…' : '';
  const headerLabel = config
    ? `ask · ${truncateTitle(story.title, Math.max(1, width - 20))} · ${config.ollama.model}${headerSuffix}`
    : 'ask';

  const historyLines = buildHistoryLines(history, width, status === 'streaming');
  const maxScroll = Math.max(0, historyLines.length - historyRows);
  const live = status === 'streaming';
  const effectiveScroll = live ? maxScroll : Math.min(scrollOffset, maxScroll);
  const start = Math.max(0, historyLines.length - historyRows - effectiveScroll);
  const visibleLines = historyLines.slice(start, start + historyRows);

  return (
    <Box flexDirection="column" width={width} height={boxHeight}>
      <Text color={theme.colors.title}>{headerLabel}</Text>
      <Text> </Text>
      {status === 'hint' &&
        AI_SETUP_HINT_LINES.map((line) => (
          <Text key={line} dimColor>
            {line}
          </Text>
        ))}
      {status === 'unavailable' && <Text color={theme.colors.error}>{unavailableDetail}</Text>}
      {(status === 'idle' || status === 'streaming' || status === 'preparing') &&
        visibleLines.map((line, i) => <Text key={i}>{line}</Text>)}
      <Text> </Text>
      <Text dimColor>{'─'.repeat(Math.max(1, width - 1))}</Text>
      <Text dimColor={status !== 'idle'}>
        {'> '}
        {input}
        {status === 'idle' ? '▊' : ''}
      </Text>
      <Text dimColor>enter send · ↑/↓ scroll · esc back/abort · ctrl+c quit</Text>
    </Box>
  );
}

function buildHistoryLines(history: Turn[], width: number, live: boolean): string[] {
  const lines: string[] = [];
  history.forEach((turn, i) => {
    const label = turn.role === 'user' ? 'you  ' : 'ai   ';
    const isLastAssistant = live && i === history.length - 1 && turn.role === 'assistant';
    const text = isLastAssistant && !turn.content ? '▍(streaming)' : turn.content;
    const wrapped = wrapPlainText(text, Math.max(1, width - label.length));
    wrapped.forEach((line, j) => {
      const suffix = isLastAssistant && j === wrapped.length - 1 && turn.content ? ' ▍' : '';
      lines.push(`${j === 0 ? label : ' '.repeat(label.length)}${line}${suffix}`);
    });
    if (turn.cancelled) lines.push(`${' '.repeat(label.length)}· cancelled`);
    lines.push('');
  });
  return lines;
}
