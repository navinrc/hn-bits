export interface ThemeColors {
  accent: string;
  title: string;
  muted: string;
  error: string;
  score: string;
  comment: string;
  selectionBackground: string;
  link: string;
  email: string;
}

export interface Theme {
  colors: ThemeColors;
  glyphs: {
    selection: string;
    foldOpen: string;
    foldClosed: string;
    upvote: string;
  };
}

const glyphs: Theme['glyphs'] = {
  selection: '❯',
  foldOpen: '▾',
  foldClosed: '▸',
  upvote: '▲',
};

function ansi256(code: number): string {
  return `ansi256(${code})`;
}

// Shared across every palette — selection is a UI affordance, not a theme accent.
const SELECTION_BACKGROUND = ansi256(238);

// Shared across every palette — contact highlighting is an affordance, not a theme accent.
const LINK = ansi256(81);
const EMAIL = ansi256(114);

// Ported from heartleo/hn-cli's internal/cli/colors.go (subset of roles this app uses).
const palettes = {
  hn: {
    accent: ansi256(208),
    title: ansi256(255),
    muted: ansi256(243),
    error: ansi256(204),
    score: ansi256(208),
    comment: ansi256(243),
    selectionBackground: SELECTION_BACKGROUND,
    link: LINK,
    email: EMAIL,
  },
  mocha: {
    accent: ansi256(183),
    title: ansi256(189),
    muted: ansi256(243),
    error: ansi256(204),
    score: ansi256(208),
    comment: ansi256(109),
    selectionBackground: SELECTION_BACKGROUND,
    link: LINK,
    email: EMAIL,
  },
  dracula: {
    accent: ansi256(141),
    title: ansi256(231),
    muted: ansi256(61),
    error: ansi256(210),
    score: ansi256(208),
    comment: ansi256(117),
    selectionBackground: SELECTION_BACKGROUND,
    link: LINK,
    email: EMAIL,
  },
  tokyo: {
    accent: ansi256(75),
    title: ansi256(189),
    muted: ansi256(59),
    error: ansi256(203),
    score: ansi256(208),
    comment: ansi256(73),
    selectionBackground: SELECTION_BACKGROUND,
    link: LINK,
    email: EMAIL,
  },
  nord: {
    accent: ansi256(110),
    title: ansi256(253),
    muted: ansi256(60),
    error: ansi256(174),
    score: ansi256(208),
    comment: ansi256(73),
    selectionBackground: SELECTION_BACKGROUND,
    link: LINK,
    email: EMAIL,
  },
  gruvbox: {
    accent: ansi256(208),
    title: ansi256(223),
    muted: ansi256(245),
    error: ansi256(167),
    score: ansi256(208),
    comment: ansi256(108),
    selectionBackground: SELECTION_BACKGROUND,
    link: LINK,
    email: EMAIL,
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
