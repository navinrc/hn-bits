import { useState, type JSX } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import { clampSelection } from '../lib/listNavigation.js';
import { paletteNames, useTheme, type PaletteName } from './theme.js';

interface ThemePickerProps {
  current: PaletteName;
  onSelect: (name: PaletteName) => void;
  onCancel: () => void;
}

export function ThemePicker({ current, onSelect, onCancel }: ThemePickerProps): JSX.Element {
  const theme = useTheme();
  const names = paletteNames();
  const [selected, setSelected] = useState(() => Math.max(0, names.indexOf(current)));

  function handleInput(input: string, key: Key): void {
    if (key.escape) return onCancel();
    if (input === 'j' || key.downArrow) return setSelected((s) => clampSelection(s, 1, names.length));
    if (input === 'k' || key.upArrow) return setSelected((s) => clampSelection(s, -1, names.length));
    if (key.return) return onSelect(names[selected]!);
  }

  useInput(handleInput);

  return (
    <Box flexDirection="column">
      <Text color={theme.colors.title}>theme</Text>
      {names.map((name, index) => {
        const isSelected = index === selected;
        const marker = isSelected ? theme.glyphs.selection : ' ';
        const background = isSelected ? theme.colors.selectionBackground : undefined;
        const suffix = name === current ? ' (current)' : '';
        return (
          <Text key={name} backgroundColor={background}>
            {marker} {name}
            {suffix}
          </Text>
        );
      })}
    </Box>
  );
}
