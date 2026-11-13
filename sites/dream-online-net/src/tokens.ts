/**
 * DREAM Space tokens for dream-online.net
 *
 * Source of truth: docs/house/DESIGN-SYSTEM.md and docs/house/SITE-BRIEF-dream-online-net.md.
 * Signal yellow (#FFD21E) is the single primary accent.
 * Every text and control colour pair on the site meets >= 7:1 WCAG AAA contrast.
 */

export const color = {
  /** Primary ground: everything sits on it. */
  ink: '#0A0B0D',
  /** Elevated surface / panel well (within 24 RGB distance of Ink for token measurement). */
  panel: '#12151A',
  /** Display headlines, active navigation labels, and primary counters. */
  porcelain: '#F4F1EA',
  /** Body copy and secondary descriptions. */
  fog: '#C9CBCE',
  /** Muted labels, chapter indices, and metadata captions (>= 7.5:1 on Ink). */
  slate: '#9DA3AA',
  /** Hairline borders, structural dividers, and 6x2 grid lines. Never text. */
  hull: '#3A3F45',
  /** The single primary accent ("needs you" / active focus / primary CTA). */
  signal: '#FFD21E',
  /** Primary button hover fill. */
  signalHover: '#E6B800',
  /** Small status indicators only. */
  statusGreen: '#58D68D',
  statusAmber: '#F5B041',
  statusRed: '#FF6B6B',
} as const;

export type ColorToken = keyof typeof color;

export const fill = {
  /** Sticky header and floating HUD glass over Ink. */
  glass: [10, 11, 13, 0.88] as const,
  /** Prompt band translucent fill. */
  band: [244, 241, 234, 0.06] as const,
  /** Faint breathing grid line over Ink. */
  gridLine: [58, 63, 69, 0.18] as const,
} as const;

export const font = {
  display: "'Space Grotesk', 'Segoe UI', system-ui, sans-serif",
  text: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif",
  mono: "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, Consolas, monospace",
} as const;

export const fontSize = {
  monoTag: 14,
  caption: 16,
  body: 20,
  kicker: 24,
  cardTitle: 32,
  h3: 40,
  h2: 56,
  hero: 72,
} as const;

export const fontWeight = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
} as const;

export const lineHeight = {
  display: 1.05,
  section: 1.08,
  subhead: 1.12,
  card: 1.2,
  body: 1.5,
} as const;

export const motion = {
  press: 120,
  reveal: 240,
  scene: 480,
  easeOut: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeInOut: 'cubic-bezier(0.65, 0, 0.35, 1)',
} as const;

export const radius = {
  button: 10,
  card: 14,
  pill: 999,
} as const;

export const size = {
  hit: 44,
  dot: 10,
  edge: 3,
  blur: 12,
} as const;

export type Ground = 'ink' | 'panel' | 'signal' | 'signalHover' | 'glass' | 'band';

export interface ColorPair {
  fg: ColorToken;
  bg: Ground;
  use: string;
}

export const SITE_COLOR_PAIRS: readonly ColorPair[] = [
  { fg: 'porcelain', bg: 'ink', use: 'display headlines H1/H2/H3, active nav links, stat counters' },
  { fg: 'fog', bg: 'ink', use: 'primary 20px body copy and supporting paragraphs' },
  { fg: 'slate', bg: 'ink', use: 'section numbers, inactive word-reveal start state, monospace tags' },
  { fg: 'signal', bg: 'ink', use: 'section kickers, status badges, active borders' },
  { fg: 'statusGreen', bg: 'ink', use: 'live realm online status indicator' },
  { fg: 'statusAmber', bg: 'ink', use: 'world tick and latency telemetry badge' },
  { fg: 'porcelain', bg: 'panel', use: 'card titles, top header wordmark, footer headings' },
  { fg: 'fog', bg: 'panel', use: 'card descriptions and footer links' },
  { fg: 'signal', bg: 'panel', use: 'active card kicker and YOU? showcase cell' },
  { fg: 'ink', bg: 'signal', use: 'primary CTA button label and active chapter pill text' },
  { fg: 'ink', bg: 'signalHover', use: 'primary CTA button label on hover' },
  { fg: 'porcelain', bg: 'glass', use: 'sticky glass header and HUD telemetry values' },
  { fg: 'fog', bg: 'glass', use: 'HUD telemetry labels and drawer descriptions' },
];

export const AAA_RATIO = 7;

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

export function overInk([r, g, b, a]: readonly [number, number, number, number]): string {
  const [ir, ig, ib] = hexToRgb(color.ink);
  return rgbToHex([ir + (r - ir) * a, ig + (g - ig) * a, ib + (b - ib) * a]);
}

export function groundHex(g: Ground): string {
  switch (g) {
    case 'ink':
      return color.ink;
    case 'panel':
      return color.panel;
    case 'signal':
      return color.signal;
    case 'signalHover':
      return color.signalHover;
    case 'glass':
      return overInk(fill.glass);
    case 'band':
      return overInk(fill.band);
  }
}

export function pairRatio(p: ColorPair): number {
  return contrastRatio(color[p.fg], groundHex(p.bg));
}
