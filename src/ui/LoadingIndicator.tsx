import { useEffect, useState, type JSX } from 'react';
import { Text } from 'ink';
import { useTheme } from './theme.js';

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
const FRAME_INTERVAL_MS = 80;

interface LoadingIndicatorProps {
  label: string;
}

export function LoadingIndicator({ label }: LoadingIndicatorProps): JSX.Element {
  const theme = useTheme();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), FRAME_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <Text>
      <Text color={theme.colors.accent}>{FRAMES[frame]}</Text> <Text color={theme.colors.title}>{label}</Text>
    </Text>
  );
}
