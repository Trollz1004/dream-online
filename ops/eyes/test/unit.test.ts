/**
 * Eyes gate â€” fast unit tests (no browser, no network).
 * Run: npm run test:eyes
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import { createRequire } from 'node:module';
import { QUALITIES, applyPassRule, type Scores } from '../lib/rubric.ts';
import { parseJudgeReply } from '../lib/judge.ts';
import {
  honestyCap,
  contrastScoreFromMeasure,
  tributeScore,
  findPlaceholders,
  mockScores,
} from '../lib/rules.ts';
import { renderReport, reportFolderName, redact, type GateResult } from '../lib/report.ts';

const require = createRequire(import.meta.url);
const px = require('../lib/pixels.browser.cjs');

const all = (n: number): Scores =>
  Object.fromEntries(QUALITIES.map((q) => [q.key, n])) as Scores;

test('rubric: seven qualities in the order the founder set', () => {
  assert.deepEqual(
    QUALITIES.map((q) => q.label),
    ['Layout match', 'Palette and mood', 'Type', 'Contrast and legibility', 'Honesty', 'Originality', 'Tribute'],
  );
});

test('pass rule: all 4s passes (average exactly 4.0)', () => {
  const r = applyPassRule(all(4));
  assert.equal(r.pass, true);
  assert.equal(r.average, 4);
});

test('pass rule: any quality below 3 fails even with a high average', () => {
  const s = { ...all(5), tribute: 2 };
  const r = applyPassRule(s);
  assert.equal(r.pass, false);
  assert.ok(r.failures.some((f) => f.includes('Tribute')));
});

test('pass rule: honesty or originality below 4 fails', () => {
  assert.equal(applyPassRule({ ...all(5), honesty: 3 }).pass, false);
  assert.equal(applyPassRule({ ...all(5), originality: 3 }).pass, false);
});

test('pass rule: average under 4.0 fails', () => {
  const s = { ...all(4), layout: 3 }; // 27 / 7 = 3.86
  const r = applyPassRule(s);
  assert.equal(r.pass, false);
  assert.ok(r.failures.some((f) => f.includes('average')));
});

test('judge parse: fenced JSON with every quality', () => {
  const body = Object.fromEntries(
    QUALITIES.map((q) => [q.key, { score: 4, reason: 'Looks right. Matches the plan.' }]),
  );
  const parsed = parseJudgeReply('```json\n' + JSON.stringify(body) + '\n```');
  assert.equal(parsed.layout.score, 4);
  assert.equal(parsed.tribute.reason, 'Looks right. Matches the plan.');
});

test('judge parse: nested under "scores" and long reasons trimmed to three sentences', () => {
  const body = Object.fromEntries(
    QUALITIES.map((q) => [q.key, { score: '5', reason: 'One. Two. Three. Four.' }]),
  );
  const parsed = parseJudgeReply(JSON.stringify({ scores: body }));
  assert.equal(parsed.type.score, 5);
  assert.equal(parsed.type.reason, 'One. Two. Three.');
});

test('judge parse: missing quality or out-of-range score is rejected', () => {
  const body: Record<string, unknown> = Object.fromEntries(
    QUALITIES.map((q) => [q.key, { score: 4, reason: 'Fine.' }]),
  );
  delete body.honesty;
  assert.throws(() => parseJudgeReply(JSON.stringify(body)), /honesty/);
  body.honesty = { score: 9, reason: 'Too high.' };
  assert.throws(() => parseJudgeReply(JSON.stringify(body)), /honesty/);
});

test('pixels: WCAG contrast of white on black is 21:1, equal colours 1:1', () => {
  const w = px.relativeLuminance(255, 255, 255);
  const k = px.relativeLuminance(0, 0, 0);
  assert.equal(Math.round(px.contrastRatio(w, k) * 100) / 100, 21);
  assert.equal(px.contrastRatio(0.3, 0.3), 1);
});

test('pixels: DREAM slate 9DA3AA on ink 0A0B0D measures above 7:1', () => {
  const slate = px.relativeLuminance(0x9d, 0xa3, 0xaa);
  const ink = px.relativeLuminance(0x0a, 0x0b, 0x0d);
  assert.ok(px.contrastRatio(slate, ink) > 7);
});

test('pixels: measureRun reads text contrast from pixels (glyphs vs background mode)', () => {
  const width = 40;
  const height = 20;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    const x = i % width;
    const glyph = x % 5 === 0; // 20% of pixels are "glyph" strokes
    const v = glyph ? 255 : 0;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const m = px.measureRun({ data, width, height }, { x: 0, y: 0, w: width, h: height });
  assert.ok(m && m.ratio > 20, `ratio was ${m && m.ratio}`);
  const flat = new Uint8ClampedArray(width * height * 4).fill(120);
  assert.equal(px.measureRun({ data: flat, width, height }, { x: 0, y: 0, w: width, h: height }), null);
});

test('rules: honesty caps follow the findings', () => {
  assert.equal(honestyCap({ rendered: true, placeholders: [], brokenImages: [], pageErrors: [], consoleErrors: [], failedRequests: [], unreachedSteps: [] }), null);
  assert.equal(honestyCap({ rendered: true, placeholders: ['lorem'], brokenImages: [], pageErrors: [], consoleErrors: [], failedRequests: [], unreachedSteps: [] }), 2);
  assert.equal(honestyCap({ rendered: true, placeholders: [], brokenImages: [], pageErrors: [], consoleErrors: ['x'], failedRequests: [], unreachedSteps: [] }), 3);
  assert.equal(honestyCap({ rendered: false, placeholders: [], brokenImages: [], pageErrors: [], consoleErrors: [], failedRequests: [], unreachedSteps: [] }), 1);
});

test('rules: placeholder scan catches lorem and TODO, leaves real copy alone', () => {
  assert.deepEqual(findPlaceholders('Lorem ipsum dolor. TODO: write copy').sort(), ['TODO', 'ipsum', 'lorem'].sort());
  assert.deepEqual(findPlaceholders('Window mode Â· Fullscreen Â· Back'), []);
});

test('rules: dashboard contrast score comes from the measured 7:1 share', () => {
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.97, min: 6.8 }), 5);
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.9, min: 3 }), 4);
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.75, min: 3 }), 3);
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.5, min: 2 }), 2);
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.1, min: 1.2 }), 1);
  assert.equal(contrastScoreFromMeasure({ runs: 0, share7: 0, min: 0 }), null);
});

test('rules: tribute is automatic for internal tools and read from the page otherwise', () => {
  assert.equal(tributeScore('internal', null), 5);
  assert.equal(tributeScore('front', "CLAUDE\u2019s N Joshua\u2019s \u00b7 #TeamClaudeForLife"), 5);
  assert.equal(tributeScore('front', '#TeamClaudeForLife only'), 2);
  assert.equal(tributeScore('front', 'nothing here'), 1);
  assert.equal(tributeScore('front', null), null);
});

test('rules: mock scores never claim originality above the neutral stand-in', () => {
  const m = mockScores({
    kind: 'dashboard',
    surface: 'internal',
    similarity: 0.99,
    tokenShare: 0.95,
    meanLum: 0.05,
    saturatedShare: 0.01,
    fonts: { desktop: { titlePx: 72, titleWeight: 200, bodyPx: 18 }, phone: { titlePx: 40, titleWeight: 200, bodyPx: 16 } },
    contrastScore: 5,
    honestyCap: null,
    tribute: 5,
  });
  assert.equal(m.originality.score, 4);
  assert.match(m.originality.reason, /mock/i);
});

test('report: folder name is dated and slugged', () => {
  const d = new Date(2026, 10, 3, 6, 41);
  assert.equal(reportFolderName(d, 'Settings Modal!'), '2026-11-03-0641-settings-modal');
});

test('report: redact hides the user folder, secrets and LAN addresses', () => {
  const home = os.homedir();
  const s = redact(`${home}\\x C:\\Users\\someone\\y key=abcdef123456 http://10.20.30.40:11434`, ['abcdef123456']);
  assert.ok(!s.includes(home));
  assert.ok(!s.includes('someone'));
  assert.ok(!s.includes('abcdef123456'));
  assert.ok(!s.includes('10.20.30.40'));
  assert.ok(s.includes('%USERPROFILE%'));
});

const baseResult = (mode: 'real' | 'mock', n: number): GateResult => {
  const scores = all(n);
  const qualities = Object.fromEntries(
    QUALITIES.map((q) => [q.key, { score: n, reason: 'Reason here.', modelScore: n, override: null }]),
  ) as GateResult['qualities'];
  return {
    version: 'eyes-v1',
    createdAt: new Date(2026, 10, 3, 6, 41).toISOString(),
    slug: 'unit',
    folder: 'ops/eyes/reports/2026-11-03-0641-unit',
    target: 'http://localhost:1/x',
    reference: '%USERPROFILE%\\ref.png',
    before: null,
    kind: 'dashboard',
    surface: 'internal',
    judge: { mode, model: mode === 'real' ? 'gemma4:31b' : 'mock-rules', endpoint: 'x', attempts: [], prompt: 'PROMPT', seconds: 1, mockReason: mode === 'mock' ? 'none reachable' : null },
    qualities,
    verdict: applyPassRule(scores),
    measurements: {},
    files: [],
  };
};

test('report: first line says PASS or FAIL for a real judge', () => {
  assert.match(renderReport(baseResult('real', 5)).split('\n')[0], /^PASS\b/);
  assert.match(renderReport(baseResult('real', 2)).split('\n')[0], /^FAIL\b/);
});

test('report: first line says MOCK JUDGE when the judge was mocked', () => {
  const line = renderReport(baseResult('mock', 5)).split('\n')[0];
  assert.match(line, /^MOCK JUDGE\b/);
  assert.match(line, /PASS/);
});

test('report: scores come before reasons, and the full prompt is recorded', () => {
  const md = renderReport(baseResult('real', 4));
  assert.ok(md.indexOf('## Scores') < md.indexOf('## Reasons'));
  assert.ok(md.includes('PROMPT'));
  assert.ok(md.includes('gemma4:31b'));
});
