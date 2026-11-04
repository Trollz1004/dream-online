/**
 * Eyes gate — deterministic rules.
 * These decide only what the rubric says must be measured or checked, never
 * taste: honesty caps from real page evidence, the dashboard 7:1 contrast
 * score from pixels, the tribute line from the page's visible text, the v1.1
 * reference-kind and 5.00 critique rules, and the clearly-labelled mock judge
 * used when no vision model is reachable.
 */
import path from 'node:path';
import { QUALITIES, type QualityKey } from './rubric.ts';

export type Kind = 'dashboard' | 'game-menu' | 'site';
export type Surface = 'front' | 'internal';

export interface ReferenceCheck {
  comparable: boolean;
  question: string | null;
  answer: string | null;
  renderedDocument: boolean;
  description: string | null;
}

/** Exact pre-judge question required by the v1.1 reference rule. */
export function referenceKindQuestion(kind: Kind): string {
  return `Is the reference image a ${kind} screen, yes or no, one word`;
}

/** Parse a one-word yes/no reply from the vision model. */
export function parseYesNo(reply: string): boolean {
  const clean = String(reply ?? '').trim().toLowerCase().replace(/[^a-z\s]/g, ' ');
  const first = clean.split(/\s+/).filter(Boolean)[0] ?? '';
  if (first === 'no' || /\bno\b/.test(clean)) return false;
  if (first === 'yes' || /\byes\b/.test(clean)) return true;
  return false;
}

/**
 * Deterministic check for rendered specification/token documents and known
 * non-comparable reference files (also used by the mock judge).
 */
export function detectRenderedDocOrWrongKind(
  refPath: string | null | undefined,
  kind: Kind,
): { renderedDocument: boolean; comparable: boolean; description: string | null } {
  if (!refPath) return { renderedDocument: false, comparable: true, description: null };
  const base = path.basename(refPath).toLowerCase();
  if (/(design[-_ ]?system|token[-_ ]?sheet|tokens\b|style[-_ ]?guide|swatch|specimen|rendered[-_ ]?doc|document|\.md\b)/i.test(base)) {
    return {
      renderedDocument: true,
      comparable: false,
      description: `The reference image was a rendered design-system token sheet rather than a ${kind} screen.`,
    };
  }
  if (/(whats[-_ ]?being[-_ ]?downloaded|launcher[-_ ]?download|download[-_ ]?page)/i.test(base)) {
    return {
      renderedDocument: false,
      comparable: false,
      description: `The reference image was a store launcher download page rather than a ${kind} screen.`,
    };
  }
  if (kind === 'dashboard' && /(game[-_ ]?menu|settings[-_ ]?modal|hermesworld[-_ ]?home|site[-_ ]?ref)/i.test(base)) {
    return {
      renderedDocument: false,
      comparable: false,
      description: 'The reference image was a different kind of screen rather than a dashboard screen.',
    };
  }
  if (kind === 'game-menu' && /(dashboard|shell[-_ ]?demo|site[-_ ]?ref)/i.test(base)) {
    return {
      renderedDocument: false,
      comparable: false,
      description: 'The reference image was a different kind of screen rather than a game-menu screen.',
    };
  }
  if (kind === 'site' && /(dashboard|shell[-_ ]?demo|game[-_ ]?menu|settings[-_ ]?modal)/i.test(base)) {
    return {
      renderedDocument: false,
      comparable: false,
      description: 'The reference image was a different kind of screen rather than a site screen.',
    };
  }
  if (process.env.EYES_MOCK_NOT_COMPARABLE === '1') {
    return {
      renderedDocument: true,
      comparable: false,
      description: `The reference image was a rendered document rather than a ${kind} screen.`,
    };
  }
  return { renderedDocument: false, comparable: true, description: null };
}

const NO_CRITIQUE_RE =
  /^(none|nothing|n\/a|na|nil|null|no|no changes?( needed)?|nothing to change|nothing i would change|everything looks? (good|great|fine|perfect)|looks? (good|great|fine|perfect)|no critique|all good)\.?$/i;

export function cleanCritique(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = String(raw).replace(/\s+/g, ' ').trim();
  if (!t || t.length < 6 || NO_CRITIQUE_RE.test(t)) return null;
  return /[.!]$/.test(t) ? t : `${t}.`;
}

export interface MutableQuality {
  score: number;
  reason: string;
  modelScore: number;
  override: string | null;
}

/** Cap layout match at 4 when the reference image is not comparable. */
export function applyReferenceRule(
  qualities: Record<QualityKey, MutableQuality>,
  refCheck: ReferenceCheck | null | undefined,
): void {
  if (!refCheck || refCheck.comparable) return;
  if (qualities.layout.score > 4) {
    qualities.layout.score = 4;
    qualities.layout.override =
      'reference image is not comparable, so layout match is scored from the written reference only and capped at 4.';
  } else if (!qualities.layout.override) {
    qualities.layout.override =
      'reference image is not comparable, so layout match is scored from the written reference only and capped at 4.';
  }
}

/**
 * Whenever the average would be 5.00, require at least one concrete thing the
 * judge would change; if the first reply returned none, ask once more, and if
 * still none, cap honesty at 4 and record that the judge gave no critique.
 */
export async function resolveCritiqueForPerfectScore(opts: {
  qualities: Record<QualityKey, MutableQuality>;
  initialCritique: string | null | undefined;
  askOnceMore?: () => Promise<string | null>;
}): Promise<{ critique: string | null; askedOnceMore: boolean; cappedHonesty: boolean }> {
  let critique = cleanCritique(opts.initialCritique);
  let askedOnceMore = false;
  let cappedHonesty = false;
  const allFive = QUALITIES.every((q) => opts.qualities[q.key].score === 5);
  if (!critique && allFive && opts.askOnceMore) {
    askedOnceMore = true;
    const second = await opts.askOnceMore();
    critique = cleanCritique(second);
  }
  if (allFive && !critique) {
    cappedHonesty = true;
    opts.qualities.honesty.score = Math.min(opts.qualities.honesty.score, 4);
    opts.qualities.honesty.override =
      'the judge gave no critique after being asked once more, so honesty is capped at 4.';
  }
  return { critique, askedOnceMore, cappedHonesty };
}

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
  referenceComparable?: boolean;
  hasSpec?: boolean;
  perfectStandIn?: boolean;
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
  let layout: number;
  let layoutReason: string;
  if (m.referenceComparable === false) {
    layout = m.honestyCap === 1 ? 2 : 4;
    layoutReason = 'Mock: reference image is not comparable; layout match is scored from the written reference only and capped at 4.';
  } else if (m.similarity === null && m.hasSpec) {
    layout = m.honestyCap === 1 ? 2 : m.perfectStandIn ? 5 : 4;
    layoutReason = 'Mock: no reference image; layout match is scored from the written reference specification.';
  } else {
    layout = band(sim, [0.9, 0.75, 0.55, 0.35]);
    layoutReason = `Mock: thumbnail correlation with the reference is ${sim}.`;
  }

  let palette: number;
  let paletteWhy: string;
  if (m.kind === 'dashboard' || m.kind === 'site') {
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
    if (d.titleWeight > 400 && !m.hasSpec && m.kind !== 'site') { type--; typeNotes.push(`title weight ${d.titleWeight}`); }
    if (d.bodyPx < 14) { type--; typeNotes.push(`desktop body ${d.bodyPx}px`); }
    if (p && p.titlePx <= p.bodyPx * 1.4) { type--; typeNotes.push('phone hierarchy flat'); }
  }

  const contrast = m.contrastScore ?? 3;
  const honesty = m.honestyCap ?? 5;
  const originality = m.perfectStandIn ? 5 : 4;
  const tribute = m.tribute ?? 3;

  return {
    layout: { score: layout, reason: layoutReason },
    palette: { score: palette, reason: `Mock: ${paletteWhy}` },
    type: { score: Math.max(1, type), reason: `Mock: ${typeNotes.length ? typeNotes.join(', ') : 'large light title and readable body at both widths'}.` },
    contrast: { score: contrast, reason: m.contrastScore === null ? 'Mock: no measured text runs; neutral stand-in.' : 'Mock: taken from the pixel contrast measurement.' },
    honesty: { score: honesty, reason: m.honestyCap === null ? 'Mock: no placeholder, broken image or console error found, and the page rendered.' : 'Mock: capped by the evidence listed under Measured.' },
    originality: { score: originality, reason: 'Mock: originality cannot be judged by rules, so this is a neutral stand-in, not a verdict.' },
    tribute: { score: tribute, reason: m.surface === 'internal' ? 'Mock: internal tool, scored 5 automatically.' : 'Mock: read from the visible page text.' },
  };
}
