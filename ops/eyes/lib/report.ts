/**
 * Eyes gate — report format (judge.md + judge.json), folder naming, redaction.
 * Line 1 of judge.md is the verdict: "PASS ..." or "FAIL ...", or
 * "MOCK JUDGE · PASS|FAIL ..." when no vision model answered.
 */
import os from 'node:os';
import { QUALITIES, labelOf, type QualityKey, type Verdict } from './rubric.ts';
import type { Kind, ReferenceCheck, Surface } from './rules.ts';

export interface QualityResult {
  score: number;
  reason: string;
  /** What the vision model (or mock) said before any measured override. */
  modelScore: number;
  /** Plain sentence explaining a measured override, or null. */
  override: string | null;
}

export interface JudgeAttempt {
  endpoint: string;
  model: string | null;
  ok: boolean;
  detail: string;
}

export interface GateResult {
  version: 'eyes-v1' | 'eyes-v1.1';
  createdAt: string;
  slug: string;
  folder: string;
  target: string;
  reference: string | null;
  spec?: string | null;
  before: string | null;
  kind: Kind;
  surface: Surface;
  referenceCheck?: ReferenceCheck | null;
  critique?: string | null;
  critiqueRetried?: boolean;
  noCritiqueCapped?: boolean;
  judge: {
    mode: 'real' | 'mock';
    model: string;
    endpoint: string;
    attempts: JudgeAttempt[];
    prompt: string;
    seconds: number;
    mockReason: string | null;
  };
  qualities: Record<QualityKey, QualityResult>;
  verdict: Verdict;
  measurements: Record<string, unknown>;
  files: string[];
}

const pad = (n: number) => String(n).padStart(2, '0');

export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'target'
  );
}

/** <YYYY-MM-DD-HHMM>-<slug>, local time. */
export function reportFolderName(d: Date, slug: string): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}-${slugify(slug)}`;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Hide the Windows user folder, any secret values, and private LAN addresses. */
export function redact(text: string, secrets: string[] = []): string {
  let out = text;
  for (const s of secrets) if (s && s.length >= 6) out = out.split(s).join('XXXX');
  const home = os.homedir();
  for (const h of [home, home.replace(/\\/g, '/')]) {
    out = out.replace(new RegExp(escapeRe(h), 'gi'), '%USERPROFILE%');
  }
  out = out.replace(/[A-Za-z]:[\\/]{1,2}Users[\\/]{1,2}[^\\/\s"'`]+/g, '%USERPROFILE%');
  out = out.replace(
    /\b(?:192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g,
    'XXXX',
  );
  return out;
}

function measuredSummaryForPerfect(r: GateResult): string {
  const m = (r.measurements ?? {}) as Record<string, any>;
  const c = m.contrastFromPixels;
  const minVal =
    typeof c?.lowestRatio === 'number'
      ? c.lowestRatio
      : typeof c?.desktop?.min === 'number' && typeof c?.phone?.min === 'number'
        ? Math.min(c.desktop.min || Infinity, c.phone.min || Infinity)
        : typeof c?.desktop?.min === 'number'
          ? c.desktop.min
          : null;
  const contrastText = minVal !== null && Number.isFinite(minVal) ? `${minVal}:1` : 'n/a';
  const h = m.honestyEvidence;
  const consoleErrors = Array.isArray(h?.consoleErrors) ? h.consoleErrors.length : 0;
  const placeholders = Array.isArray(h?.placeholders) ? h.placeholders.length : 0;
  return `(lowest contrast ${contrastText}, console errors ${consoleErrors}, placeholders ${placeholders})`;
}

export function firstLine(r: GateResult): string {
  const v = r.verdict;
  const word = v.pass ? 'PASS' : 'FAIL';
  const notComparable = r.referenceCheck && !r.referenceCheck.comparable ? ' · REFERENCE NOT COMPARABLE' : '';
  const avgText =
    v.average === 5
      ? `average ${v.average.toFixed(2)} of 5 ${measuredSummaryForPerfect(r)}`
      : `average ${v.average.toFixed(2)} of 5`;
  const low = `lowest ${v.lowest.score} (${labelOf(v.lowest.key)})`;
  const core = `${word}${notComparable} · Eyes gate v1.1 · ${avgText} · ${low} · ${r.slug}`;
  if (r.judge.mode === 'mock') {
    const why = r.judge.mockReason ?? 'no vision model answered';
    return `MOCK JUDGE · ${core} · ${why}, so these are rule-based stand-in scores, not a real verdict`;
  }
  return core;
}

export function renderReport(r: GateResult): string {
  const L: string[] = [];
  L.push(firstLine(r));
  if (r.referenceCheck && !r.referenceCheck.comparable && r.referenceCheck.description) {
    L.push(r.referenceCheck.description);
  }
  L.push('');
  L.push('## Scores');
  L.push('');
  for (const q of QUALITIES) {
    const x = r.qualities[q.key];
    const note = x.override ? ` (judge said ${x.modelScore}; measured override)` : '';
    L.push(`- ${q.label}: ${x.score} of 5${note}`);
  }
  L.push(`- Average: ${r.verdict.average.toFixed(2)} (a pass needs 4.0 or better)`);
  L.push('');
  L.push('## Reasons');
  L.push('');
  for (const q of QUALITIES) {
    const x = r.qualities[q.key];
    L.push(`### ${q.label}: ${x.score}`);
    L.push('');
    L.push(x.reason);
    if (x.override) {
      L.push('');
      L.push(`Measured override: ${x.override}`);
    }
    L.push('');
  }
  if (r.critique || r.noCritiqueCapped || r.verdict.average === 5) {
    L.push('## What the judge would change');
    L.push('');
    if (r.critique) {
      L.push(`- ${r.critique}`);
    } else {
      L.push('The judge gave no critique after being asked once more, so honesty is capped at 4.');
    }
    L.push('');
  }
  L.push('## Why it passed or failed');
  L.push('');
  L.push('The rule: average 4.0 or better, no quality below 3, and honesty and originality both 4 or better.');
  L.push('');
  if (r.verdict.pass) L.push('Every part of the rule is met.');
  else for (const f of r.verdict.failures) L.push(`- ${f}.`);
  L.push('');
  L.push('## Measured from the pixels and the page');
  L.push('');
  L.push('```json');
  L.push(JSON.stringify(r.measurements, null, 2));
  L.push('```');
  L.push('');
  L.push('## Run');
  L.push('');
  L.push(`- Created: ${r.createdAt}`);
  L.push(`- Target: ${r.target}`);
  L.push(`- Reference: ${r.reference ?? 'none (written spec only)'}`);
  if (r.spec) L.push(`- Spec: ${r.spec}`);
  if (r.referenceCheck?.question) {
    L.push(
      `- Reference check: "${r.referenceCheck.question}" -> ${r.referenceCheck.answer ?? 'n/a'} (${r.referenceCheck.comparable ? 'comparable' : 'REFERENCE NOT COMPARABLE'})`,
    );
  }
  if (r.before) L.push(`- Before: ${r.before}`);
  L.push(`- Kind: ${r.kind}; surface: ${r.surface}`);
  L.push('- Viewports: desktop 1920x1080 and phone 390x844, both at device scale 2');
  L.push(`- Judge mode: ${r.judge.mode === 'real' ? 'real vision model' : 'MOCK (rule-based stand-in)'}`);
  L.push(`- Judge model: ${r.judge.model}`);
  L.push(`- Judge endpoint: ${r.judge.endpoint}`);
  L.push(`- Judge time: ${r.judge.seconds.toFixed(1)} s`);
  if (r.judge.mockReason) L.push(`- Why mocked: ${r.judge.mockReason}`);
  if (r.judge.attempts.length) {
    L.push('- Endpoints tried, in order:');
    for (const a of r.judge.attempts) {
      L.push(`  - ${a.endpoint}${a.model ? ` (${a.model})` : ''}: ${a.ok ? 'answered' : 'failed'}: ${a.detail}`);
    }
  }
  L.push(`- Files: ${r.files.join(', ')}`);
  L.push('');
  L.push('## Judge prompt (full, as sent)');
  L.push('');
  L.push('````text');
  L.push(r.judge.prompt);
  L.push('````');
  L.push('');
  return L.join('\n');
}
