/**
 * Eyes gate — end-to-end tests through the real CLI.
 * The fixtures are served on localhost; the reference for both is the PASS
 * fixture's own desktop screenshot. The judge is whatever is reachable
 * (EYES_JUDGE=auto by default): a real Ollama vision model, or the clearly
 * labelled MOCK JUDGE when none answers. Run: npm run test:eyes
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright';
import { captureShot } from '../lib/capture.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const eyesDir = path.resolve(here, '..');
const repoRoot = path.resolve(eyesDir, '..', '..');
const fixtures = path.join(eyesDir, 'fixtures');

let server: http.Server;
let base = '';
let referencePng = '';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'eyes-test-'));

test.before(async () => {
  server = http.createServer((req, res) => {
    const name = path.basename(new URL(req.url ?? '/', 'http://x').pathname);
    const file = path.join(fixtures, name);
    if (!/\.html$/.test(name) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(fs.readFileSync(file));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  // The PASS fixture's own screenshot is the reference.
  const browser = await chromium.launch({ headless: true });
  try {
    referencePng = path.join(tmp, 'pass-reference.png');
    await captureShot(browser, `${base}/pass.html`, 'desktop', referencePng, { clicks: [], waitFor: null, settleMs: 300 });
  } finally {
    await browser.close();
  }
});

test.after(() => {
  server?.close();
  fs.rmSync(tmp, { recursive: true, force: true });
});

interface CliRun {
  code: number;
  stdout: string;
  stderr: string;
  folder: string;
  firstLine: string;
  json: any;
}

function runGate(args: string[]): Promise<CliRun> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      ['--import', 'tsx', path.join(eyesDir, 'eyes.ts'), ...args, '--no-share'],
      { cwd: repoRoot, env: process.env, maxBuffer: 16 * 1024 * 1024, timeout: 15 * 60 * 1000 },
      (err, stdout, stderr) => {
        const code = err ? Number((err as NodeJS.ErrnoException & { code?: number }).code ?? 2) : 0;
        const rel = /^REPORT: (.+)$/m.exec(stdout)?.[1]?.trim() ?? '';
        const folder = rel ? path.join(repoRoot, rel) : '';
        const md = folder && fs.existsSync(path.join(folder, 'judge.md')) ? fs.readFileSync(path.join(folder, 'judge.md'), 'utf8') : '';
        const json = folder && fs.existsSync(path.join(folder, 'judge.json')) ? JSON.parse(fs.readFileSync(path.join(folder, 'judge.json'), 'utf8')) : null;
        resolve({ code, stdout, stderr, folder, firstLine: md.split('\n')[0] ?? '', json });
      },
    );
  });
}

function expectFiles(folder: string) {
  for (const f of ['after-desktop.png', 'after-phone.png', 'reference.png', 'side-by-side.png', 'judge.md', 'judge.json']) {
    assert.ok(fs.existsSync(path.join(folder, f)), `missing ${f}`);
  }
}

function expectHonestLabel(run: CliRun) {
  if (run.json.judge.mode === 'mock') assert.match(run.firstLine, /^MOCK JUDGE\b/);
  else {
    assert.match(run.firstLine, /^(PASS|FAIL)\b/);
    assert.doesNotMatch(run.firstLine, /MOCK/);
  }
}

test('PASS fixture passes against its own screenshot', async (t) => {
  const run = await runGate([
    '--target', `${base}/pass.html`,
    '--reference', referencePng,
    '--slug', 'test-pass-fixture',
    '--kind', 'dashboard',
    '--surface', 'front',
    '--settle-ms', '300',
  ]);
  t.diagnostic(run.firstLine);
  t.diagnostic(`judge: ${run.json?.judge.mode} · ${run.json?.judge.model}`);
  t.diagnostic(`scores: ${run.json ? Object.entries(run.json.qualities).map(([k, v]: any) => `${k} ${v.score}`).join(', ') : run.stderr}`);
  t.diagnostic(`report: ${path.relative(repoRoot, run.folder)}`);
  assert.equal(run.code, 0, run.stderr || run.stdout);
  expectFiles(run.folder);
  expectHonestLabel(run);
  assert.match(run.firstLine, /\bPASS\b/);
  assert.equal(run.json.verdict.pass, true);
  assert.equal(run.json.measurements.contrastFromPixels.scoreFromPixels, 5);
});

test('FAIL fixture (placeholder text and low contrast) fails', async (t) => {
  const run = await runGate([
    '--target', `${base}/fail.html`,
    '--reference', referencePng,
    '--slug', 'test-fail-fixture',
    '--kind', 'dashboard',
    '--surface', 'front',
    '--settle-ms', '300',
  ]);
  t.diagnostic(run.firstLine);
  t.diagnostic(`judge: ${run.json?.judge.mode} · ${run.json?.judge.model}`);
  t.diagnostic(`scores: ${run.json ? Object.entries(run.json.qualities).map(([k, v]: any) => `${k} ${v.score}`).join(', ') : run.stderr}`);
  t.diagnostic(`report: ${path.relative(repoRoot, run.folder)}`);
  assert.equal(run.code, 1, run.stderr || run.stdout);
  expectFiles(run.folder);
  expectHonestLabel(run);
  assert.match(run.firstLine, /\bFAIL\b/);
  assert.ok(run.json.measurements.honestyEvidence.placeholders.includes('lorem'));
  assert.ok(run.json.qualities.honesty.score <= 2, 'honesty must be capped by the placeholder text');
  assert.ok(run.json.qualities.contrast.score <= 2, 'contrast must be scored low from the pixels');
});

test('a mocked judge says MOCK JUDGE in the first line and never claims a real score', async (t) => {
  const run = await runGate([
    '--target', `${base}/fail.html`,
    '--reference', referencePng,
    '--slug', 'test-mock-judge',
    '--judge', 'mock',
    '--settle-ms', '300',
  ]);
  t.diagnostic(run.firstLine);
  assert.equal(run.code, 1, run.stderr || run.stdout);
  assert.match(run.firstLine, /^MOCK JUDGE · FAIL\b/);
  assert.equal(run.json.judge.mode, 'mock');
  assert.match(run.json.qualities.originality.reason, /^Mock:/);
});
