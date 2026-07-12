import { type JSX } from 'react';
import { Box, Text } from 'ink';
import { GLOBAL_KEYS, type KeyBinding } from './keymap.js';
import { useTheme } from './theme.js';

interface HelpOverlayProps {
  title: string;
  keys: readonly KeyBinding[];
}

export function HelpOverlay({ title, keys }: HelpOverlayProps): JSX.Element {
  const theme = useTheme();
  return (
    <Box flexDirection="column">
      <Text color={theme.colors.title}>{title}</Text>
      {keys.map((binding) => (
        <KeyRow key={binding.key} binding={binding} />
      ))}
      <Text> </Text>
      <Text color={theme.colors.title}>global</Text>
      {GLOBAL_KEYS.map((binding) => (
        <KeyRow key={binding.key} binding={binding} />
      ))}
      <Text dimColor>any key closes</Text>
    </Box>
  );
}

function KeyRow({ binding }: { binding: KeyBinding }): JSX.Element {
  return (
    <Text>
      {'  '}
      {binding.key.padEnd(8)} {binding.label}
    </Text>
  );
}
