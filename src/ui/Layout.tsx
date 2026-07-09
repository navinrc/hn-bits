import { type JSX, type ReactNode } from 'react';
import { Box, Text, useWindowSize } from 'ink';
import { theme } from './theme.js';

const MIN_ROWS = 8;

export const HEADER_ROWS = 1;

interface ScreenProps {
  children: ReactNode;
}

export function Screen({ children }: ScreenProps): JSX.Element {
  const { columns, rows } = useWindowSize();

  if (rows < MIN_ROWS) {
    return <Text>Terminal too small — resize to continue.</Text>;
  }

  return (
    <Box flexDirection="column" width={columns} height={rows}>
      {children}
    </Box>
  );
}

interface HeaderProps {
  children?: ReactNode;
}

export function Header({ children }: HeaderProps): JSX.Element {
  return <Box flexShrink={0}>{children}</Box>;
}

interface BodyProps {
  children?: ReactNode;
}

export function Body({ children }: BodyProps): JSX.Element {
  return (
    <Box flexGrow={1} overflowY="hidden" flexDirection="column">
      {children}
    </Box>
  );
}

interface FooterProps {
  children?: ReactNode;
}

export function Footer({ children }: FooterProps): JSX.Element {
  return (
    <Box flexShrink={0}>
      <Text color={theme.colors.muted}>{children}</Text>
    </Box>
  );
}
