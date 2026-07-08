export interface ThemeColors {
  accent: string;
  title: string;
  muted: string;
  error: string;
  score: string;
  comment: string;
}

export interface Theme {
  colors: ThemeColors;
  glyphs: {
    selection: string;
    foldOpen: string;
    foldClosed: string;
    points: string;
    comments: string;
  };
}

const glyphs: Theme['glyphs'] = {
  selection: '▸',
  foldOpen: '▾',
  foldClosed: '▸',
  points: '^',
  comments: 'c:',
};

function ansi256(code: number): string {
  return `ansi256(${code})`;
}

// Ported from heartleo/hn-cli's internal/cli/colors.go (subset of roles this app uses).
const palettes = {
  hn: {
    accent: ansi256(208),
    title: ansi256(255),
    muted: ansi256(243),
    error: ansi256(204),
    score: ansi256(208),
    comment: ansi256(243),
  },
  mocha: {
    accent: ansi256(183),
    title: ansi256(189),
    muted: ansi256(243),
    error: ansi256(204),
    score: ansi256(208),
    comment: ansi256(109),
  },
  dracula: {
    accent: ansi256(141),
    title: ansi256(231),
    muted: ansi256(61),
    error: ansi256(210),
    score: ansi256(208),
    comment: ansi256(117),
  },
  tokyo: {
    accent: ansi256(75),
    title: ansi256(189),
    muted: ansi256(59),
    error: ansi256(203),
    score: ansi256(208),
    comment: ansi256(73),
  },
  nord: {
    accent: ansi256(110),
    title: ansi256(253),
    muted: ansi256(60),
    error: ansi256(174),
    score: ansi256(208),
    comment: ansi256(73),
  },
  gruvbox: {
    accent: ansi256(208),
    title: ansi256(223),
    muted: ansi256(245),
    error: ansi256(167),
    score: ansi256(208),
    comment: ansi256(108),
  },
} satisfies Record<string, ThemeColors>;

export type PaletteName = keyof typeof palettes;

const DEFAULT_PALETTE: PaletteName = 'hn';

export function paletteNames(): PaletteName[] {
  return Object.keys(palettes) as PaletteName[];
}

function isPaletteName(name: string): name is PaletteName {
  return name in palettes;
}

export function resolvePaletteName(name?: string): PaletteName {
  const candidate = name ?? process.env['HN_THEME'] ?? DEFAULT_PALETTE;
  return isPaletteName(candidate) ? candidate : DEFAULT_PALETTE;
}

export function resolveTheme(name?: string): Theme {
  return { colors: palettes[resolvePaletteName(name)], glyphs };
}

export const theme = resolveTheme();
