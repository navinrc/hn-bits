import { useState, type JSX } from 'react';
import { Text, useInput } from 'ink';

interface SearchInputProps {
  onSubmit: (query: string) => void;
  onCancel: () => void;
}

export function SearchInput({ onSubmit, onCancel }: SearchInputProps): JSX.Element {
  const [query, setQuery] = useState('');

  useInput((input, key) => {
    if (key.escape) return onCancel();
    if (key.return) return submit();
    if (key.backspace || key.delete) return setQuery((q) => q.slice(0, -1));
    if (input && !key.ctrl && !key.meta) setQuery((q) => q + input);
  });

  function submit() {
    if (query.trim()) onSubmit(query.trim());
  }

  return <Text>/ {query}▊</Text>;
}
