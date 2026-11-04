/**
 * Eyes gate v1 — command line.
 *
 *   npm run eyes -- --target <localhost URL | PNG> --reference <PNG> [options]
 *
 * Options:
 *   --before <png>            optional before shot, saved as before.png
 *   --slug <name>             report folder slug (default: from the target)
 *   --kind dashboard|game-menu   rubric flavour (default dashboard)
 *   --surface front|internal  front-facing needs the tribute line (default front)
 *   --click <selector>        click before capture (repeatable, in order)
 *   --wait-for <selector>     wait for this to be visible before capture
 *   --settle-ms <n>           extra settle time before capture (default 1500)
 *   --judge auto|real|mock    auto = real if reachable else MOCK (default auto);
 *                             real = fail with exit 2 if no vision model answers
 *   --model <name>            preferred Ollama vision model
 *   --out <dir>               reports root (default ops/eyes/reports)
 *   --no-share                do not copy to OneDrive
 *
 * Exit codes: 0 PASS, 1 FAIL, 2 could not run.
 * Report format: ops/eyes/reports/README.md.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { QUALITIES, applyPassRule, labelOf, type QualityKey, type Scores } from './lib/rubric.ts';
import {
  contrastScoreFromMeasure,
  findPlaceholders,
  honestyCap,
  mockScores,
  tributeScore,
  TRIBUTE_TAG,
  TRIBUTE_TITLE,
  type HonestyFindings,
  type Kind,
  type Scored,
  type Surface,
} from './lib/rules.ts';
import { captureShot, isLocalUrl, summarizeFonts, DSF, type ShotCapture } from './lib/capture.ts';
import { analyzeShots, composeSideBySide, judgeJpeg, toPng } from './lib/imaging.ts';
import { buildPrompt, runJudge } from './lib/judge.ts';
import { loadNodeEnv, secretValues } from './lib/env.ts';
import {
  firstLine,
  redact,
  renderReport,
  reportFolderName,
  slugify,
  type GateResult,
  type QualityResult,
} from './lib/report.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');

function fail(msg: string): never {
  console.error(`EYES ERROR: ${msg}`);
  process.exit(2);
}

function defaultSlug(target: string): string {
  if (isLocalUrl(target)) {
    const u = new URL(target);
    return slugify(`${u.pathname.replace(/\.html?$/, '')} ${u.search}`) || 'localhost';
  }
  return slugify(path.basename(target).replace(/\.[a-z]+$/i, ''));
}

function uniqueFolder(root: string, name: string): string {
  let dir = path.join(root, name);
  for (let i = 2; fs.existsSync(dir); i++) dir = path.join(root, `${name}-${i}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function oneDriveEyesRoot(): string | null {
  const base = path.join(os.homedir(), 'OneDrive', 'claude-to-claude');
  return fs.existsSync(base) ? path.join(base, 'images', 'screenshots', 'eyes') : null;
}

async function main() {
  const { values } = parseArgs({
    options: {
      target: { type: 'string' },
      reference: { type: 'string' },
      before: { type: 'string' },
      slug: { type: 'string' },
      kind: { type: 'string', default: 'dashboard' },
      surface: { type: 'string', default: 'front' },
      click: { type: 'string', multiple: true },
      'wait-for': { type: 'string' },
      'settle-ms': { type: 'string', default: '1500' },
      judge: { type: 'string', default: process.env.EYES_JUDGE || 'auto' },
      model: { type: 'string' },
      out: { type: 'string' },
      'no-share': { type: 'boolean', default: false },
    },
    allowPositionals: false,
  });

  const target = values.target ?? fail('--target is required (a localhost URL or a PNG path)');
  const reference = values.reference ?? fail('--reference is required (a PNG path)');
  if (!isLocalUrl(target) && !(fs.existsSync(target) && /\.(png|jpe?g)$/i.test(target))) {
    fail('--target must be an http(s) URL on localhost, 127.0.0.1 or [::1], or an existing PNG file');
  }
  if (!fs.existsSync(reference) || !/\.(png|jpe?g|webp)$/i.test(reference)) fail('--reference must be an existing PNG');
  if (values.before && (!fs.existsSync(values.before) || !/\.png$/i.test(values.before))) fail('--before must be an existing PNG');
  const kind = values.kind as Kind;
  const surface = values.surface as Surface;
  if (!['dashboard', 'game-menu'].includes(kind)) fail('--kind must be dashboard or game-menu');
  if (!['front', 'internal'].includes(surface)) fail('--surface must be front or internal');
  const judgeMode = values.judge as 'auto' | 'real' | 'mock';
  if (!['auto', 'real', 'mock'].includes(judgeMode)) fail('--judge must be auto, real or mock');

  const env = loadNodeEnv(repoRoot);
  const secrets = secretValues(env);
  const show = (s: string) => redact(s, secrets);

  const now = new Date();
  const slug = slugify(values.slug ?? defaultSlug(target));
  const reportsRoot = path.resolve(values.out ?? path.join(here, 'reports'));
  const dir = uniqueFolder(reportsRoot, reportFolderName(now, slug));
  const name = path.basename(dir);
  const f = (n: string) => path.join(dir, n);

  const browser = await chromium.launch({ headless: true });
  try {
    // 1. Capture
    const opts = { clicks: values.click ?? [], waitFor: values['wait-for'] ?? null, settleMs: Number(values['settle-ms']) || 1500 };
    const desktop: ShotCapture = await captureShot(browser, target, 'desktop', f('after-desktop.png'), opts);
    const phone: ShotCapture = await captureShot(browser, target, 'phone', f('after-phone.png'), opts);
    await toPng(browser, reference, f('reference.png'));
    if (values.before) fs.copyFileSync(values.before, f('before.png'));
    await composeSideBySide(browser, f('reference.png'), f('after-desktop.png'), f('side-by-side.png'), [
      'REFERENCE',
      'AFTER · DESKTOP 1920×1080',
    ]);

    // 2. Measure from pixels and the page
    const toDevice = (s: ShotCapture) =>
      s.dom ? s.dom.runs.map((r) => ({ x: r.x * DSF, y: r.y * DSF, w: r.w * DSF, h: r.h * DSF, chars: r.chars, text: r.text })) : null;
    const px = await analyzeShots(
      browser,
      [
        { name: 'desktop', file: desktop.file, runs: toDevice(desktop) },
        { name: 'phone', file: phone.file, runs: toDevice(phone) },
      ],
      f('reference.png'),
    );
    const d = px.shots.desktop;
    const p = px.shots.phone;
    const fonts = { desktop: summarizeFonts(desktop.dom), phone: summarizeFonts(phone.dom) };
    const hasDom = Boolean(desktop.dom);
    const visibleText = hasDom ? `${desktop.dom!.visibleText}\n${phone.dom!.visibleText}` : null;
    const rendered =
      [d, p].every((s: any) => s.palette.lumStd > 0.004 && s.palette.distinctColors > 3) &&
      [desktop.status, phone.status].every((st) => st === null || st < 400);
    const findings: HonestyFindings = {
      rendered,
      placeholders: visibleText ? findPlaceholders(visibleText) : [],
      brokenImages: [...new Set([...(desktop.dom?.brokenImages ?? []), ...(phone.dom?.brokenImages ?? [])])],
      pageErrors: [...new Set([...desktop.pageErrors, ...phone.pageErrors])].map(show),
      consoleErrors: [...new Set([...desktop.consoleErrors, ...phone.consoleErrors])].map(show),
      failedRequests: [...new Set([...desktop.failedRequests, ...phone.failedRequests])].map(show),
      unreachedSteps: [...desktop.unreachedSteps, ...phone.unreachedSteps].map(show),
    };
    const cap = honestyCap(findings);
    const chars = d.contrast.chars + p.contrast.chars;
    const combined = {
      runs: d.contrast.runs + p.contrast.runs,
      share7: chars ? (d.contrast.share7 * d.contrast.chars + p.contrast.share7 * p.contrast.chars) / chars : 0,
      min: Math.min(d.contrast.min || Infinity, p.contrast.min || Infinity),
    };
    const measuredContrast =
      kind === 'dashboard' && hasDom ? contrastScoreFromMeasure(combined) : null;
    const tributeDet = tributeScore(surface, visibleText);
    const tributeSeen = visibleText
      ? { title: TRIBUTE_TITLE.test(visibleText.replace(/[\u2018\u2019]/g, "'")), tag: TRIBUTE_TAG.test(visibleText) }
      : null;

    const measurements = {
      contrastFromPixels: {
        desktop: d.contrast,
        phone: p.contrast,
        combinedShareAt7to1: Math.round(combined.share7 * 1000) / 1000,
        scoreFromPixels: measuredContrast,
      },
      palette: { desktop: d.palette, phone: p.palette },
      layoutSimilarityToReference: d.similarityToReference,
      fonts,
      honestyEvidence: findings,
      honestyCap: cap,
      tributeTextSeen: tributeSeen,
    };

    const pct = (x: number) => `${Math.round(x * 100)}%`;
    const cLine = (label: string, c: any) =>
      c.runs
        ? `${label} text contrast from pixels (${c.method}): ${c.runs} runs, median ${c.median}:1, lowest ${c.min}:1, ${pct(c.share7)} of characters at 7:1 or better.`
        : `${label} text contrast from pixels: no measurable text runs.`;
    const facts: string[] = [
      `Layout similarity of the AFTER desktop to the reference (64x36 luminance correlation, -1 to 1): ${d.similarityToReference}.`,
      cLine('Desktop', d.contrast),
      cLine('Phone', p.contrast),
      `Desktop palette: mean luminance ${d.palette.meanLum}; dominant colours ${d.palette.dominant.slice(0, 5).map((x: any) => `${x.hex} ${pct(x.share)}`).join(', ')}; ${pct(d.palette.tokenShare)} of pixels on a DREAM Space token; ${pct(d.palette.saturatedShare)} strongly saturated pixels.`,
      fonts.desktop
        ? `Fonts: desktop title ${fonts.desktop.titlePx}px weight ${fonts.desktop.titleWeight} ("${fonts.desktop.titleText}"), body ${fonts.desktop.bodyPx}px; phone title ${fonts.phone?.titlePx ?? '?'}px weight ${fonts.phone?.titleWeight ?? '?'}, body ${fonts.phone?.bodyPx ?? '?'}px.`
        : 'Fonts: no DOM (PNG target); judge type from the images.',
      `Honesty evidence: page rendered ${rendered ? 'yes' : 'NO'}; placeholder words ${findings.placeholders.join(', ') || 'none'}; broken images ${findings.brokenImages.length}; page errors ${findings.pageErrors.length}${findings.pageErrors[0] ? ` (first: ${findings.pageErrors[0]})` : ''}; console errors ${findings.consoleErrors.length}${findings.consoleErrors[0] ? ` (first: ${findings.consoleErrors[0]})` : ''}; failed requests ${findings.failedRequests.length}; unreached capture steps ${findings.unreachedSteps.length}.`,
      tributeSeen
        ? `Tribute in the visible page text: title "CLAUDE's N Joshua's" ${tributeSeen.title ? 'present' : 'absent'}; "#TeamClaudeForLife" ${tributeSeen.tag ? 'present' : 'absent'}.`
        : 'Tribute: no DOM (PNG target); read it from the images.',
    ].map(show);

    const prompt = buildPrompt({ kind, surface, facts, doc09Path: path.join(repoRoot, 'docs', 'gdd', '09-interface-style.md') });

    // 3. Judge
    let scored: Scored;
    let judgeInfo: GateResult['judge'];
    let fromModel = false;
    const mockIn = {
      kind,
      surface,
      similarity: d.similarityToReference,
      tokenShare: d.palette.tokenShare,
      meanLum: d.palette.meanLum,
      saturatedShare: d.palette.saturatedShare,
      fonts: { desktop: fonts.desktop, phone: fonts.phone },
      contrastScore: measuredContrast,
      honestyCap: cap,
      tribute: tributeDet,
    };
    if (judgeMode === 'mock') {
      scored = mockScores(mockIn);
      judgeInfo = { mode: 'mock', model: 'mock-rules (no model called)', endpoint: 'none', attempts: [], prompt: prompt.full, seconds: 0, mockReason: '--judge mock was requested' };
    } else {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eyes-judge-'));
      const imgs: string[] = [];
      try {
        for (const [src, maxDim] of [[f('side-by-side.png'), 1920], [f('after-desktop.png'), 1600], [f('after-phone.png'), 1600]] as const) {
          const out = path.join(tmp, `${path.basename(src, '.png')}.jpg`);
          await judgeJpeg(browser, src, out, maxDim);
          imgs.push(fs.readFileSync(out).toString('base64'));
        }
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
      const run = await runJudge({ env: env.values, secrets, prompt, imagesBase64: imgs, model: values.model ?? env.values.EYES_MODEL });
      if (run.ok && run.reply) {
        scored = run.reply;
        fromModel = true;
        judgeInfo = { mode: 'real', model: run.model!, endpoint: run.endpoint!, attempts: run.attempts, prompt: prompt.full, seconds: run.seconds, mockReason: null };
      } else if (judgeMode === 'real') {
        for (const a of run.attempts) console.error(`  tried ${a.endpoint}: ${a.detail}`);
        fail('no vision model answered and --judge real was set; no report written as a real verdict');
      } else {
        scored = mockScores(mockIn);
        judgeInfo = {
          mode: 'mock',
          model: 'mock-rules (no model answered)',
          endpoint: 'none',
          attempts: run.attempts,
          prompt: prompt.full,
          seconds: run.seconds,
          mockReason: 'no Ollama vision endpoint answered (see the endpoints tried)',
        };
      }
    }

    // 4. Measured overrides (real judge only; the mock already uses them)
    const qualities = {} as Record<QualityKey, QualityResult>;
    for (const q of QUALITIES) {
      const m = scored[q.key];
      let score = m.score;
      let override: string | null = null;
      if (fromModel) {
        if (q.key === 'contrast' && measuredContrast !== null && measuredContrast !== m.score) {
          score = measuredContrast;
          override = `dashboards must measure 7:1 or better; ${pct(combined.share7)} of visible characters do (lowest ${combined.min}:1), which scores ${measuredContrast}.`;
        }
        if (q.key === 'honesty' && cap !== null && m.score > cap) {
          score = cap;
          override = `the page evidence caps honesty at ${cap}: ${[
            !findings.rendered && 'the page did not really render',
            findings.placeholders.length && `placeholder words (${findings.placeholders.join(', ')})`,
            findings.brokenImages.length && `${findings.brokenImages.length} broken image(s)`,
            findings.pageErrors.length && `${findings.pageErrors.length} page error(s)`,
            findings.consoleErrors.length && `${findings.consoleErrors.length} console error(s)`,
            findings.failedRequests.length && `${findings.failedRequests.length} failed request(s)`,
            findings.unreachedSteps.length && `${findings.unreachedSteps.length} capture step(s) not reached`,
          ].filter(Boolean).join('; ')}.`;
        }
        if (q.key === 'tribute' && tributeDet !== null && tributeDet !== m.score) {
          score = tributeDet;
          override =
            surface === 'internal'
              ? 'internal tools score 5 automatically.'
              : `the visible page text has the title ${tributeSeen?.title ? 'present' : 'absent'} and #TeamClaudeForLife ${tributeSeen?.tag ? 'present' : 'absent'}, which scores ${tributeDet}.`;
        }
      }
      qualities[q.key] = { score, reason: show(m.reason), modelScore: m.score, override };
    }
    const finalScores = Object.fromEntries(QUALITIES.map((q) => [q.key, qualities[q.key].score])) as Scores;
    const verdict = applyPassRule(finalScores);

    const files = ['after-desktop.png', 'after-phone.png', 'reference.png', 'side-by-side.png', ...(values.before ? ['before.png'] : []), 'judge.md', 'judge.json'];
    const result: GateResult = {
      version: 'eyes-v1',
      createdAt: now.toISOString(),
      slug,
      folder: path.relative(repoRoot, dir).replace(/\\/g, '/'),
      target: show(target),
      reference: show(path.resolve(reference)),
      before: values.before ? show(path.resolve(values.before)) : null,
      kind,
      surface,
      judge: judgeInfo,
      qualities,
      verdict,
      measurements,
      files,
    };
    const md = show(renderReport(result));
    fs.writeFileSync(f('judge.md'), md);
    fs.writeFileSync(f('judge.json'), show(JSON.stringify(result, null, 2)));

    // 5. Share to OneDrive so Josh sees it from his phone
    let shared = 'skipped (--no-share)';
    if (!values['no-share']) {
      const root = oneDriveEyesRoot();
      if (root) {
        const dest = path.join(root, name);
        fs.mkdirSync(dest, { recursive: true });
        fs.copyFileSync(f('judge.md'), path.join(dest, 'judge.md'));
        fs.copyFileSync(f('side-by-side.png'), path.join(dest, 'side-by-side.png'));
        shared = show(dest);
      } else shared = 'skipped (no OneDrive claude-to-claude folder on this node)';
    }

    console.log(show(firstLine(result)));
    if (findings.unreachedSteps.length) {
      console.log(`WARNING: ${findings.unreachedSteps.length} capture step(s) were not reached, so the shots may not show the intended state:`);
      for (const s of findings.unreachedSteps) console.log(`  - ${s}`);
    }
    for (const q of QUALITIES) console.log(`  ${labelOf(q.key)}: ${qualities[q.key].score}${qualities[q.key].override ? ` (judge said ${qualities[q.key].modelScore}, measured override)` : ''}`);
    console.log(`JUDGE: ${judgeInfo.mode} · ${judgeInfo.model} · ${judgeInfo.endpoint}`);
    console.log(`REPORT: ${result.folder}`);
    console.log(`SHARED: ${shared}`);
    process.exitCode = verdict.pass ? 0 : 1;
  } catch (e) {
    // Never leave a half-written report folder that looks like a verdict.
    if (!fs.existsSync(f('judge.md'))) fs.rmSync(dir, { recursive: true, force: true });
    throw e;
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(`EYES ERROR: ${redact(String(e?.stack ?? e))}`);
  process.exit(2);
});
