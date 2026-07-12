import { useEffect, useRef, useState, type JSX } from 'react';
import { Box, Text, useInput, useWindowSize, type Key } from 'ink';
import { searchRecent } from '../api/algolia.js';
import type { Story } from '../api/firebase.js';
import { addSubscription, updateSubscription, type Subscription } from '../db/subscriptions.js';
import { truncateTitle } from '../lib/format.js';
import { useTheme } from './theme.js';

const PREVIEW_DEBOUNCE_MS = 300;
const PREVIEW_WINDOW_DAYS = 7;
const PREVIEW_LIMIT = 5;

type Field = 'name' | 'query' | 'minPoints';
const FIELD_ORDER: Field[] = ['name', 'query', 'minPoints'];

interface SubscriptionFormProps {
  mode: 'add' | 'edit';
  subscription?: Subscription;
  prefillQuery?: string;
  onSave: () => void;
  onCancel: () => void;
}

function windowStart(): number {
  return Math.floor(Date.now() / 1000) - PREVIEW_WINDOW_DAYS * 24 * 60 * 60;
}

export function SubscriptionForm({
  mode,
  subscription,
  prefillQuery,
  onSave,
  onCancel,
}: SubscriptionFormProps): JSX.Element {
  const theme = useTheme();
  const { columns } = useWindowSize();
  const [name, setName] = useState(subscription?.name ?? '');
  const [query, setQuery] = useState(subscription?.query ?? prefillQuery ?? '');
  const [minPoints, setMinPoints] = useState(String(subscription?.minPoints ?? 0));
  const [field, setField] = useState<Field>('name');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<Story[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const previewToken = useRef(0);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setPreview([]);
      return;
    }
    debounceRef.current = setTimeout(() => void loadPreview(), PREVIEW_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, minPoints]);

  async function loadPreview(): Promise<void> {
    const myToken = ++previewToken.current;
    const points = Number(minPoints) || 0;
    try {
      const results = await searchRecent(query, { createdAfter: windowStart(), minPoints: points, hitsPerPage: PREVIEW_LIMIT });
      if (myToken === previewToken.current) setPreview(results);
    } catch {
      if (myToken === previewToken.current) setPreview([]);
    }
  }

  function save(): void {
    const trimmedName = name.trim();
    const trimmedQuery = query.trim();
    if (!trimmedName) return setError('name is required');
    if (!trimmedQuery) return setError('query is required');
    const points = Number(minPoints) || 0;
    try {
      if (mode === 'add') addSubscription(trimmedName, trimmedQuery, points);
      else updateSubscription(subscription!.id, { name: trimmedName, query: trimmedQuery, minPoints: points });
      onSave();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function handleInput(input: string, key: Key): void {
    if (key.escape) return onCancel();
    if (key.tab) {
      const index = FIELD_ORDER.indexOf(field);
      return setField(FIELD_ORDER[(index + 1) % FIELD_ORDER.length]!);
    }
    if (key.return) return save();
    if (key.backspace || key.delete) {
      if (field === 'name') setName((v) => v.slice(0, -1));
      if (field === 'query') setQuery((v) => v.slice(0, -1));
      if (field === 'minPoints') setMinPoints((v) => v.slice(0, -1));
      return;
    }
    if (input && !key.ctrl && !key.meta) {
      if (field === 'name') setName((v) => v + input);
      if (field === 'query') setQuery((v) => v + input);
      if (field === 'minPoints' && /^\d+$/.test(input)) {
        setMinPoints((v) => (v === '0' ? input : v + input));
      }
    }
  }

  useInput(handleInput);

  const cursor = (f: Field): string => (field === f ? '▏' : '');
  const previewLabel = Number(minPoints) > 0 ? `≥${minPoints} pts` : 'any points';

  return (
    <Box flexDirection="column">
      <Text color={theme.colors.title}>{mode === 'add' ? 'New subscription' : 'Edit subscription'}</Text>
      <Text> </Text>
      <Text>
        name:        {name}
        {cursor('name')}
      </Text>
      <Text>
        query:       {query}
        {cursor('query')}
      </Text>
      <Text>
        min points:  {minPoints}
        {cursor('minPoints')}
      </Text>
      <Text> </Text>
      {query.trim() && (
        <Box flexDirection="column">
          <Text dimColor>
            preview (last 7 days, {previewLabel}):
          </Text>
          {preview.length === 0 && <Text dimColor> no matches</Text>}
          {preview.map((story, i) => (
            <Text key={story.id}>
              {' '}
              {i + 1}. {truncateTitle(story.title, Math.max(1, columns - 24))}  {story.score} pts
            </Text>
          ))}
        </Box>
      )}
      {error && <Text color={theme.colors.error}>{error}</Text>}
      <Text> </Text>
      <Text dimColor>tab next field · enter save · esc cancel</Text>
    </Box>
  );
}
