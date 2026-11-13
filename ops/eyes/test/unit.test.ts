/**
 * Eyes gate — fast unit tests (no browser, no network).
 * Run: npm run test:eyes
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { QUALITIES, applyPassRule, type Scores } from '../lib/rubric.ts';
import {
  buildPrompt,
  evaluateReferenceKind,
  parseJudgeCritique,
  parseJudgeReply,
  resolveSpecPath,
} from '../lib/judge.ts';
import {
  applyReferenceRule,
  cleanCritique,
  contrastScoreFromMeasure,
  findPlaceholders,
  honestyCap,
  mockScores,
  parseYesNo,
  referenceKindQuestion,
  resolveCritiqueForPerfectScore,
  tributeScore,
} from '../lib/rules.ts';
import { renderReport, reportFolderName, redact, type GateResult } from '../lib/report.ts';

const require = createRequire(import.meta.url);
const px = require('../lib/pixels.browser.cjs');
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');

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
  assert.deepEqual(findPlaceholders('Window mode · Fullscreen · Back'), []);
});

test('rules: dashboard contrast score comes from the measured 7:1 share', () => {
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.97, min: 6.8 }), 5);
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.9, min: 3 }), 4);
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.75, min: 3 }), 3);
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.5, min: 2 }), 2);
  assert.equal(contrastScoreFromMeasure({ runs: 20, share7: 0.1, min: 1.2 }), 1);
  assert.equal(contrastScoreFromMeasure({ runs: 0, share7: 0, min: 0 }), null);
});

test('rules: tribute is automatic for internal tools and forbidden on front-facing surfaces per 2026-11-12 ruling', () => {
  assert.equal(tributeScore('internal', null), 5);
  assert.equal(tributeScore('front', 'nothing here'), 5);
  assert.equal(tributeScore('front', '#TeamClaudeForLife only'), 1);
  assert.equal(tributeScore('front', "CLAUDE\u2019s N Joshua\u2019s \u00b7 #TeamClaudeForLife"), 1);
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
    version: 'eyes-v1.1',
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

test('v1.1 reference-kind check: asks exact question, flags REFERENCE NOT COMPARABLE, caps layout at 4, and follows PASS line with one sentence', async () => {
  assert.equal(referenceKindQuestion('game-menu'), 'Is the reference image a game-menu screen, yes or no, one word');
  assert.equal(referenceKindQuestion('dashboard'), 'Is the reference image a dashboard screen, yes or no, one word');
  assert.equal(referenceKindQuestion('site'), 'Is the reference image a site screen, yes or no, one word');
  assert.equal(parseYesNo('yes'), true);
  assert.equal(parseYesNo('No.'), false);

  const asked: string[] = [];
  const checkNo = await evaluateReferenceKind({
    kind: 'game-menu',
    referencePath: 'whats being downloaded.png',
    askYesNo: async (q) => {
      asked.push(q);
      return 'no';
    },
  });
  assert.deepEqual(asked, ['Is the reference image a game-menu screen, yes or no, one word']);
  assert.equal(checkNo?.comparable, false);
  assert.match(checkNo?.description ?? '', /store launcher download page/i);

  const checkDoc = await evaluateReferenceKind({
    kind: 'dashboard',
    referencePath: 'design-system-reference.png',
    askYesNo: async () => 'yes',
  });
  assert.equal(checkDoc?.comparable, false);
  assert.equal(checkDoc?.renderedDocument, true);
  assert.match(checkDoc?.description ?? '', /rendered design-system token sheet/i);

  const r = baseResult('mock', 5);
  r.referenceCheck = checkDoc;
  applyReferenceRule(r.qualities, checkDoc);
  assert.equal(r.qualities.layout.score, 4);
  r.verdict = applyPassRule(Object.fromEntries(QUALITIES.map((q) => [q.key, r.qualities[q.key].score])) as Scores);
  const lines = renderReport(r).split('\n');
  assert.match(lines[0], /REFERENCE NOT COMPARABLE/);
  assert.equal(lines[1], checkDoc?.description);
});

test('v1.1 perfect score rule: carries measured numbers on first line, lists critique, retries once, and caps honesty at 4 if still none', async () => {
  assert.equal(cleanCritique('none'), null);
  assert.equal(cleanCritique('Nothing to change.'), null);
  assert.equal(cleanCritique('Increase mobile card gap from 18px to 24px'), 'Increase mobile card gap from 18px to 24px.');

  const body = {
    ...Object.fromEntries(QUALITIES.map((q) => [q.key, { score: 5, reason: 'Solid.' }])),
    critique: 'Widen the phone card padding to 24px.',
  };
  assert.equal(parseJudgeCritique(JSON.stringify(body)), 'Widen the phone card padding to 24px.');

  // 1) Average 5.00 with a concrete critique: measured numbers on line 1 + critique in report
  const r1 = baseResult('mock', 5);
  r1.measurements = {
    contrastFromPixels: { lowestRatio: 7.74 },
    honestyEvidence: { consoleErrors: [], placeholders: [] },
  };
  r1.critique = 'Widen the phone card padding to 24px.';
  const md1 = renderReport(r1);
  assert.match(md1.split('\n')[0], /average 5\.00 of 5 \(lowest contrast 7\.74:1, console errors 0, placeholders 0\)/);
  assert.ok(md1.includes('## What the judge would change'));
  assert.ok(md1.includes('- Widen the phone card padding to 24px.'));

  // 2) First reply gives none, gate asks once more and receives a concrete critique
  const r2 = baseResult('mock', 5);
  let retryCount = 0;
  const res2 = await resolveCritiqueForPerfectScore({
    qualities: r2.qualities,
    initialCritique: 'none',
    askOnceMore: async () => {
      retryCount++;
      return 'Add 4px more bottom margin below the subtitle.';
    },
  });
  assert.equal(retryCount, 1);
  assert.equal(res2.askedOnceMore, true);
  assert.equal(res2.cappedHonesty, false);
  assert.equal(r2.qualities.honesty.score, 5);
  assert.equal(res2.critique, 'Add 4px more bottom margin below the subtitle.');

  // 3) First reply gives none, gate asks once more and still gets none -> honesty capped at 4
  const r3 = baseResult('mock', 5);
  const res3 = await resolveCritiqueForPerfectScore({
    qualities: r3.qualities,
    initialCritique: 'none',
    askOnceMore: async () => 'nothing to change',
  });
  assert.equal(res3.askedOnceMore, true);
  assert.equal(res3.cappedHonesty, true);
  assert.equal(r3.qualities.honesty.score, 4);
  r3.noCritiqueCapped = true;
  r3.verdict = applyPassRule(Object.fromEntries(QUALITIES.map((q) => [q.key, r3.qualities[q.key].score])) as Scores);
  assert.equal(r3.verdict.average, 4.86);
  const md3 = renderReport(r3);
  assert.match(md3, /judge gave no critique/i);
});

test('v1.1 --spec written reference: resolves docs/gdd/09 and docs/house/SITE-BRIEF-*.md without a reference picture', () => {
  const gdd09 = resolveSpecPath('docs/gdd/09', repoRoot);
  assert.ok(gdd09 && gdd09.endsWith('09-interface-style.md'), `resolved gdd09 was ${gdd09}`);
  const siteBrief = resolveSpecPath('docs/house/SITE-BRIEF-dream-online-net.md', repoRoot);
  assert.ok(siteBrief && siteBrief.endsWith('SITE-BRIEF-dream-online-net.md'), `resolved siteBrief was ${siteBrief}`);

  const prompt = buildPrompt({
    kind: 'site',
    surface: 'front',
    facts: ['Layout reference: written specification only.'],
    doc09Path: gdd09!,
    specPath: siteBrief!,
    hasReferenceImage: false,
  });
  assert.ok(prompt.user.includes('You are given two images (no reference image was provided'));
  assert.ok(prompt.user.includes('Surface kind: site.'));
  assert.ok(prompt.user.includes('Written reference specification'));
});
