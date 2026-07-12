import { useEffect, useRef, useState, type JSX } from 'react';
import { Box, Text, useInput } from 'ink';
import type { PromptResult } from '../ai/context.js';
import { chatStream, describeError, type ChatMessage } from '../ai/ollama.js';
import { AI_SETUP_HINT_LINES, type Config } from '../lib/config.js';
import { wrapPlainText } from '../lib/viewport.js';
import { useTheme } from './theme.js';

const SYSTEM_PROMPT =
  'You are a concise assistant summarizing Hacker News content. Plain text only, no markdown headers. Max ~150 words.';

interface SummaryPanelProps {
  config: Config | null;
  buildPrompt: (signal: AbortSignal) => Promise<PromptResult>;
  height: number;
  width: number;
  onClose: () => void;
}

type Status = 'setup-hint' | 'preparing' | 'thinking' | 'streaming' | 'done' | 'error';

export function SummaryPanel({ config, buildPrompt, height, width, onClose }: SummaryPanelProps): JSX.Element {
  const theme = useTheme();
  const [status, setStatus] = useState<Status>(config ? 'preparing' : 'setup-hint');
  const [content, setContent] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [scrollOffset, setScrollOffset] = useState(0);
  const token = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (config) void generate();
    return () => controllerRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(): Promise<void> {
    if (!config) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const myToken = ++token.current;

    setStatus('preparing');
    setContent('');
    setNotice('');
    setError('');
    setScrollOffset(0);

    let prompt: string;
    try {
      const result = await buildPrompt(controller.signal);
      if (myToken !== token.current) return;
      prompt = result.prompt;
      if (result.notice) setNotice(result.notice);
    } catch (err) {
      if (myToken !== token.current) return;
      setStatus('error');
      setError(describeError(err));
      return;
    }

    setStatus('thinking');
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: prompt },
    ];

    try {
      for await (const delta of chatStream(config.ollama, messages, controller.signal)) {
        if (myToken !== token.current) return;
        setStatus('streaming');
        setContent((prev) => prev + delta);
      }
      if (myToken === token.current) setStatus('done');
    } catch (err) {
      if (myToken !== token.current) return;
      setStatus('error');
      setError(describeError(err));
    }
  }

  useInput((input, key) => {
    if (key.escape) {
      controllerRef.current?.abort();
      return onClose();
    }
    if (input === 's') return void generate();
    if (input === 'j') return setScrollOffset((s) => s + 1);
    if (input === 'k') return setScrollOffset((s) => Math.max(0, s - 1));
  });

  const innerWidth = Math.max(1, width - 4);
  const innerHeight = Math.max(1, height - 2);
  const live = status === 'preparing' || status === 'thinking' || status === 'streaming';
  const chromeRows = 2 + (notice ? 1 : 0);
  const contentRows = Math.max(1, innerHeight - chromeRows);

  const wrapped = wrapPlainText(content, innerWidth);
  const maxScroll = Math.max(0, wrapped.length - contentRows);
  const effectiveScroll = live ? maxScroll : Math.min(scrollOffset, maxScroll);
  const visibleLines = wrapped.slice(effectiveScroll, effectiveScroll + contentRows);

  const thinkingSuffix = status === 'preparing' || status === 'thinking' ? ' · thinking…' : '';
  const headerLabel = config ? `summary · ${config.ollama.model}${thinkingSuffix}` : 'summary';
  const footerHint =
    status === 'setup-hint' ? 'esc close' : 'esc close · s regenerate · j/k scroll';

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.colors.accent}
      height={height}
      width={width}
      paddingX={1}
    >
      <Text color={theme.colors.title}>{headerLabel}</Text>
      {status === 'setup-hint' &&
        AI_SETUP_HINT_LINES.map((line) => (
          <Text key={line} dimColor>
            {line}
          </Text>
        ))}
      {status === 'error' && <Text color={theme.colors.error}>{error}</Text>}
      {status !== 'setup-hint' &&
        status !== 'error' &&
        visibleLines.map((line, i) => (
          <Text key={i}>
            {line}
            {live && i === visibleLines.length - 1 ? '▍' : ''}
          </Text>
        ))}
      {notice && status !== 'setup-hint' && <Text dimColor>{notice}</Text>}
      <Text dimColor>{footerHint}</Text>
    </Box>
  );
}
