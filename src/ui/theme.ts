export const theme = {
  colors: {
    dim: 'gray',
    error: 'red',
    accent: 'yellow',
    title: 'cyan',
  },
  glyphs: {
    selection: '▸',
    foldOpen: '▾',
    foldClosed: '▸',
    points: '^',
    comments: 'c:',
  },
} as const;

export type Theme = typeof theme;
