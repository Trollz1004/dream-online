/**
 * DREAM Space tokens — the one tokens file for the in-house dashboard shell.
 *
 * Source of truth for the values: docs/house/DESIGN-SYSTEM.md (that page
 * points back here). Every colour, size, duration and radius the shell uses
 * comes from this file; src/shell/styles.ts only turns these into CSS.
 *
 * Dashboards are held to WCAG AAA: every text and control pair the shell
 * draws is listed in SHELL_COLOR_PAIRS and must compute to 7:1 or better
 * (tests/shell-tokens.test.ts). Nothing here depends on game code.
 */

/** Palette (sRGB hex). */
export const color = {
  /** The ground. Everything sits on it. */
  ink: '#0A0B0D',
  /** Display text and light. */
  porcelain: '#F4F1EA',
  /** Body text and secondary copy. */
  fog: '#C9CBCE',
  /** Captions and control outlines, used sparingly. Only ever on pure Ink. */
  slate: '#9DA3AA',
  /** Borders, panels, dividers. Never text, never the only edge of a control. */
  hull: '#3A3F45',
  /** The one accent: "needs you", the active marker and the focus ring. */
  signal: '#FFD21E',
  signalHover: '#E6B800',
  /** Small status words only; yellow is never a status. */
  statusGreen: '#58D68D',
  statusAmber: '#F5B041',
  statusRed: '#FF6B6B',
} as const;

export type ColorToken = keyof typeof color;

/**
 * Tokens from the design page that the shell deliberately does not use, with
 * the reason. They stay listed so nobody re-adds them by accident.
 */
export const colorNotUsed = {
  /** Disabled yellow: 3.6:1 on Ink, fails AAA. The shell has no disabled controls. */
  signalDim: '#7A6A1E',
  /** Grey status: 4.2:1 on Ink, fails AAA. Unknown states are spelled out in Fog. */
  statusGrey: '#6E757C',
} as const;

/** Translucent fills from the design page, as [r, g, b, alpha] over Ink. */
export const fill = {
  /** Header and dark see-through panel glass. */
  glass: [10, 11, 13, 0.72] as const,
  /** Prompt band. */
  band: [244, 241, 234, 0.06] as const,
  /** The faint breathing grid in the main view, at its brightest. */
  gridLine: [58, 63, 69, 0.18] as const,
};

export const font = {
  display: "'Space Grotesk', 'Segoe UI', system-ui, sans-serif",
  text: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
  /** Terminal and code only; same open-licensed family as the text face. */
  mono: "'IBM Plex Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace",
} as const;

/** Google Fonts stylesheet for the two faces (plus Plex Mono for code). */
export const fontStylesheetHref =
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;700&display=swap';

/**
 * Type scale in px. The design page also lists 14 px for captions, but the
 * founder's dashboard rule is "never under 16 px", so 14 is left out.
 */
export const fontSize = {
  caption: 16,
  body: 20,
  lead: 24,
  h3: 24,
  h2: 32,
  h1: 40,
  display: 56,
  hero: 72,
} as const;

export const MIN_FONT_PX = 16;

export const fontWeight = {
  text: 400,
  textMedium: 500,
  textStrong: 600,
  subhead: 500,
  display: 700,
} as const;

export const lineHeight = {
  display: 1.05,
  text: 1.5,
} as const;

export const letterSpacing = {
  displayLarge: '-0.02em',
} as const;

/** Motion. Reduced motion turns every animation into a fade. */
export const motion = {
  press: 120,
  reveal: 240,
  scene: 480,
  /** Easing out, for arrivals. */
  easeOut: 'cubic-bezier(0.16, 1, 0.3, 1)',
  /** Easing in-out, for moves. */
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

export const radius = {
  button: 10,
  card: 14,
  pill: 999,
} as const;

export const size = {
  /** Smallest hit area for anything clickable. */
  hit: 44,
  /** Status pill dot. */
  dot: 10,
  /** Signal edge on the card that needs the person, and the active marker. */
  edge: 3,
  /** Focus ring width and offset. */
  focusRing: 3,
  focusOffset: 2,
  /** Glass blur. */
  blur: 12,
  /** Phone layout below this CSS width: drawer sidebar, bottom-sheet dock. */
  phoneMaxWidth: 899.98,
} as const;

/** Spacing steps in rem (1 rem = 16 px at default text size). */
export const space = {
  1: 0.25,
  2: 0.5,
  3: 0.75,
  4: 1,
  5: 1.5,
  6: 2,
  7: 3,
} as const;

// ---------------------------------------------------------------------------
// Grounds and pairs

/** Every background a shell text or control sits on, as an opaque sRGB hex. */
export type Ground = 'ink' | 'signal' | 'signalHover' | 'glass' | 'band' | 'gridLine';

export type PairKind = 'text' | 'control' | 'focus';

export interface ColorPair {
  /** Foreground token. */
  fg: ColorToken;
  /** Ground it sits on. */
  bg: Ground;
  kind: PairKind;
  /** Where the shell uses it. */
  use: string;
}

/**
 * Every text and control pair the shell draws. The test computes each one
 * and fails below 7:1. Add a pair here before using it in styles.ts.
 */
export const SHELL_COLOR_PAIRS: readonly ColorPair[] = [
  { fg: 'porcelain', bg: 'ink', kind: 'text', use: 'titles, active labels, button text' },
  { fg: 'fog', bg: 'ink', kind: 'text', use: 'body copy, inactive labels' },
  { fg: 'slate', bg: 'ink', kind: 'text', use: 'captions and hints on the bare ground' },
  { fg: 'signal', bg: 'ink', kind: 'text', use: '"needs you" words' },
  { fg: 'statusGreen', bg: 'ink', kind: 'text', use: 'status word: ok' },
  { fg: 'statusAmber', bg: 'ink', kind: 'text', use: 'status word: waiting' },
  { fg: 'statusRed', bg: 'ink', kind: 'text', use: 'status word: down' },
  { fg: 'ink', bg: 'signal', kind: 'text', use: 'primary button label' },
  { fg: 'ink', bg: 'signalHover', kind: 'text', use: 'primary button label on hover' },
  { fg: 'porcelain', bg: 'glass', kind: 'text', use: 'text on the glass header and sheet' },
  { fg: 'fog', bg: 'glass', kind: 'text', use: 'body on glass' },
  { fg: 'porcelain', bg: 'band', kind: 'text', use: 'prompt band text' },
  { fg: 'fog', bg: 'band', kind: 'text', use: 'prompt band body' },
  { fg: 'porcelain', bg: 'gridLine', kind: 'text', use: 'titles crossing a grid line' },
  { fg: 'fog', bg: 'gridLine', kind: 'text', use: 'body crossing a grid line' },
  { fg: 'slate', bg: 'gridLine', kind: 'text', use: 'captions crossing a grid line' },
  { fg: 'slate', bg: 'ink', kind: 'control', use: 'secondary button, input and menu-trigger outline' },
  { fg: 'fog', bg: 'ink', kind: 'control', use: 'control outline on hover' },
  { fg: 'porcelain', bg: 'ink', kind: 'control', use: 'checked radio mark, open sheet handle' },
  { fg: 'signal', bg: 'ink', kind: 'control', use: 'primary button edge, active tab and item marker' },
  { fg: 'signal', bg: 'ink', kind: 'focus', use: 'focus ring (always drawn on Ink via offset)' },
];

/** The required ratio for every pair above. */
export const AAA_RATIO = 7;

// ---------------------------------------------------------------------------
// Colour maths (WCAG 2.x), kept here so the tokens file can prove itself.

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: readonly [number, number, number]): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** A translucent fill composited over Ink, as the browser paints it (sRGB blend). */
export function overInk([r, g, b, a]: readonly [number, number, number, number]): string {
  const [ir, ig, ib] = hexToRgb(color.ink);
  return rgbToHex([ir + (r - ir) * a, ig + (g - ig) * a, ib + (b - ib) * a]);
}

/** Opaque hex for a ground. */
export function groundHex(g: Ground): string {
  switch (g) {
    case 'ink':
      return color.ink;
    case 'signal':
      return color.signal;
    case 'signalHover':
      return color.signalHover;
    case 'glass':
      return overInk(fill.glass);
    case 'band':
      return overInk(fill.band);
    case 'gridLine':
      return overInk(fill.gridLine);
  }
}

export function pairRatio(p: ColorPair): number {
  return contrastRatio(color[p.fg], groundHex(p.bg));
}

/** `rgba()` string for a fill. */
export function rgba([r, g, b, a]: readonly [number, number, number, number]): string {
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** px to rem at the default 16 px root, so text scales with the person's setting. */
export const rem = (px: number): string => `${px / 16}rem`;
