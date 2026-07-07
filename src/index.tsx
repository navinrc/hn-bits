#!/usr/bin/env node
import { render, Box, Text } from 'ink';

render(
  <Box borderStyle="round" paddingX={1}>
    <Text color="green">hn-bits alive</Text>
  </Box>,
);
