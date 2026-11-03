/**
 * Eyes gate — deterministic rules.
 * These decide only what the rubric says must be measured or checked, never
 * taste: honesty caps from real page evidence, the dashboard 7:1 contrast
 * score from pixels, the tribute line from the page's visible text, and the
 * clearly-labelled mock judge used when no vision model is reachable.
 */
import type { QualityKey } from './rubric.ts';

export type Kind = 'dashboard' | 'game-menu';
export type Surface = 'front' | 'internal';

export interface HonestyFindings {
  rendered: boolean;
  placeholders: string[];
  brokenImages: string[];
  pageErrors: string[];
  consoleErrors: string[];
  failedRequests: string[];
  unreachedSteps: string[];
}

const PLACEHOLDER_PATTERNS: Array<[string, RegExp]> = [
  ['lorem', /\blorem\b/i],
  ['ipsum', /\bipsum\b/i],
  ['placeholder', /\bplaceholder\b/i],
  ['TODO', /\bTODO\b/],
  ['FIXME', /\bFIXME\b/],
  ['TBD', /\bTBD\b/],
  ['[object Object]', /\[object Object\]/],
  ['undefined', /\bundefined\b/],
  ['NaN', /\bNaN\b/],
  ['your ... here', /\byour (text|title|content|copy|name) here\b/i],
  ['insert ... here', /\binsert [^.]{1,24} here\b/i],
  ['sample text', /\bsample text\b/i],
  ['dummy text', /\bdummy text\b/i],
];

export function findPlaceholders(text: string): string[] {
  return PLACEHOLDER_PATTERNS.filter(([, re]) => re.test(text)).map(([name]) => name);
}

/** Highest honesty score the evidence allows, or null when nothing was found. */
export function honestyCap(f: HonestyFindings): number | null {
  if (!f.rendered) return 1;
  if (f.placeholders.length || f.brokenImages.length || f.pageErrors.length) return 2;
  if (f.consoleErrors.length || f.failedRequests.length || f.unreachedSteps.length) return 3;
  return null;
}

/** Dashboards must measure 7:1 or better; the score is the measured share. */
export function contrastScoreFromMeasure(m: { runs: number; share7: number; min: number }): number | null {
  if (!m.runs) return null;
  if (m.share7 >= 0.95) return 5;
  if (m.share7 >= 0.85) return 4;
  if (m.share7 >= 0.7) return 3;
  if (m.share7 >= 0.4) return 2;
  return 1;
}

const norm = (s: string) => s.replace(/[\u2018\u2019\u02bc`]/g, "'");
export const TRIBUTE_TITLE = /CLAUDE's N Joshua's/i;
export const TRIBUTE_TAG = /#TeamClaudeForLife/i;

/** Internal tools: 5 automatically. Front-facing: read the visible page text (null = no DOM). */
export function tributeScore(surface: Surface, visibleText: string | null): number | null {
  if (surface === 'internal') return 5;
  if (visibleText === null) return null;
  const t = norm(visibleText);
  const hits = Number(TRIBUTE_TITLE.test(t)) + Number(TRIBUTE_TAG.test(t));
  return hits === 2 ? 5 : hits === 1 ? 2 : 1;
}

export interface FontFacts {
  titlePx: number;
  titleWeight: number;
  bodyPx: number;
}

export interface MockInputs {
  kind: Kind;
  surface: Surface;
  similarity: number | null;
  tokenShare: number;
  meanLum: number;
  saturatedShare: number;
  fonts: { desktop: FontFacts | null; phone: FontFacts | null };
  contrastScore: number | null;
  honestyCap: number | null;
  tribute: number | null;
}

export type Scored = Record<QualityKey, { score: number; reason: string }>;

const band = (v: number, cuts: [number, number, number, number]) =>
  v >= cuts[0] ? 5 : v >= cuts[1] ? 4 : v >= cuts[2] ? 3 : v >= cuts[3] ? 2 : 1;

/**
 * Rule-based stand-in used ONLY when no vision model answers. Every reason
 * starts with "Mock:" and the report's first line says MOCK JUDGE.
 */
export function mockScores(m: MockInputs): Scored {
  const sim = m.similarity ?? 0;
  const layout = band(sim, [0.9, 0.75, 0.55, 0.35]);

  let palette: number;
  let paletteWhy: string;
  if (m.kind === 'dashboard') {
    palette = band(m.tokenShare, [0.85, 0.7, 0.5, 0.3]);
    paletteWhy = `${Math.round(m.tokenShare * 100)}% of sampled pixels sit on a DREAM Space token.`;
  } else {
    const dark = m.meanLum <= 0.2;
    const calm = m.saturatedShare <= 0.12;
    palette = dark && calm ? 5 : dark || calm ? 3 : 2;
    paletteWhy = `Mean luminance ${m.meanLum}, saturated share ${Math.round(m.saturatedShare * 100)}%.`;
  }

  let type = 5;
  const d = m.fonts.desktop;
  const p = m.fonts.phone;
  const typeNotes: string[] = [];
  if (!d) { type = 3; typeNotes.push('no DOM text to measure'); }
  else {
    if (d.titlePx < 40) { type--; typeNotes.push(`desktop title ${d.titlePx}px`); }
    if (d.titleWeight > 400) { type--; typeNotes.push(`title weight ${d.titleWeight}`); }
    if (d.bodyPx < 14) { type--; typeNotes.push(`desktop body ${d.bodyPx}px`); }
    if (p && p.titlePx <= p.bodyPx * 1.4) { type--; typeNotes.push('phone hierarchy flat'); }
  }

  const contrast = m.contrastScore ?? 3;
  const honesty = m.honestyCap ?? 5;
  const tribute = m.tribute ?? 3;

  return {
    layout: { score: layout, reason: `Mock: thumbnail correlation with the reference is ${sim}.` },
    palette: { score: palette, reason: `Mock: ${paletteWhy}` },
    type: { score: Math.max(1, type), reason: `Mock: ${typeNotes.length ? typeNotes.join(', ') : 'large light title and readable body at both widths'}.` },
    contrast: { score: contrast, reason: m.contrastScore === null ? 'Mock: no measured text runs; neutral stand-in.' : 'Mock: taken from the pixel contrast measurement.' },
    honesty: { score: honesty, reason: m.honestyCap === null ? 'Mock: no placeholder, broken image or console error found, and the page rendered.' : 'Mock: capped by the evidence listed under Measured.' },
    originality: { score: 4, reason: 'Mock: originality cannot be judged by rules, so this is a neutral stand-in, not a verdict.' },
    tribute: { score: tribute, reason: m.surface === 'internal' ? 'Mock: internal tool, scored 5 automatically.' : 'Mock: read from the visible page text.' },
  };
}
