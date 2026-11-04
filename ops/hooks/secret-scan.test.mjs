import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, ALLOW_MARKER, scanText } from './secret-scan.mjs';

const SCANNER = join(dirname(fileURLToPath(import.meta.url)), 'secret-scan.mjs');

// Fake credentials are assembled at runtime from pieces so this file itself never contains
// a key-shaped string (the scanner would, rightly, block this file otherwise). Every body is
// the word FAKE repeated, so none of these can be mistaken for, or work as, a real key.
const FAKE = 'FAKE'.repeat(16);
const FAKES = Object.freeze({
  'anthropic-key': ['sk', '-', 'ant', '-', 'api03-', FAKE].join(''),
  'github-token': ['gh', 'p', '_', FAKE].join(''),
  'github-token (gho_)': ['gh', 'o', '_', FAKE].join(''),
  'github-token (ghs_)': ['gh', 's', '_', FAKE].join(''),
  'github-fine-grained-pat': ['github', '_pat_', '11', FAKE].join(''),
  'google-api-key': ['AI', 'za', 'Sy', FAKE].join(''),
  'square-access-token': ['EAA', 'A', FAKE].join(''),
  'square-oauth-secret': ['sq0', 'csp', '-', FAKE].join(''),
  'paypal-access-token': ['A21', 'AA', FAKE].join(''),
  'paypal-braintree-token': ['access_token', '$', 'production', '$', 'fakefakefakefake', '$', 'fa'.repeat(16)].join(''),
  'paypal-secret-assignment': ['PAYPAL_CLIENT', '_SECRET=', FAKE].join(''),
});

const CLEAN_TEXT = [
  '# Clean prose that talks about keys without containing one',
  'Never commit an Anthropic key; they start with sk-ant- and are never needed here.',
  'GitHub tokens begin with ghp_ or github_pat_ and Google keys with AIza. Do not paste them.',
  'PAYPAL_CLIENT_SECRET=<set in the personal vault, never here>',
  'SQUARE_ACCESS_TOKEN=',
  'const risk_ant_total = 3; // risk-ant-colony is not a key',
  'const sha = "5f1c0b9d2a7e4c3b8a6d1e0f9c2b7a4d3e5f6a7b";',
].join('\n');

test('every rule has a fake fixture that is blocked', () => {
  for (const rule of RULES) {
    assert.ok(Object.keys(FAKES).some((k) => k.startsWith(rule.id)), `no fixture covers rule ${rule.id}`);
  }
  for (const [name, fake] of Object.entries(FAKES)) {
    const findings = scanText(`const value = "${fake}";`);
    assert.ok(findings.length >= 1, `scanner did not flag fake ${name}`);
    const wanted = name.split(' ')[0];
    assert.ok(findings.some((f) => f.rule === wanted), `fake ${name} flagged by ${findings.map((f) => f.rule).join(',')} instead of ${wanted}`);
  }
});

test('clean text passes', () => {
  assert.deepEqual(scanText(CLEAN_TEXT), []);
});

test('findings never carry the matched value and report the right line', () => {
  const text = ['line one', 'line two', FAKES['anthropic-key'], 'line four'].join('\n');
  const findings = scanText(text);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].line, 3);
  assert.ok(!JSON.stringify(findings).includes(FAKE), 'finding leaked key body');
});

test('allow marker skips a deliberately fake fixture line', () => {
  assert.deepEqual(scanText(`${FAKES['google-api-key']} // ${ALLOW_MARKER}`), []);
  assert.equal(scanText(FAKES['google-api-key']).length, 1);
});

test('CLI --stdin exits 1 on a fake key and 0 on clean text, without echoing the key', () => {
  const bad = spawnSync(process.execPath, [SCANNER, '--stdin'], { input: `token=${FAKES['github-token']}\n`, encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /BLOCKED/);
  assert.ok(!bad.stderr.includes(FAKE) && !bad.stdout.includes(FAKE), 'CLI printed the key body');
  const good = spawnSync(process.execPath, [SCANNER, '--stdin'], { input: CLEAN_TEXT, encoding: 'utf8' });
  assert.equal(good.status, 0);
});

function sh(cwd, ...args) {
  return execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', ...args], { cwd, encoding: 'utf8' }).trim();
}

test('--pre-push scans only the commits being pushed (existing remote branch and new branch)', () => {
  const root = mkdtempSync(join(tmpdir(), 'secret-scan-test-'));
  try {
    const remote = join(root, 'remote.git');
    const work = join(root, 'work');
    mkdirSync(remote);
    mkdirSync(work);
    sh(remote, 'init', '--bare', '-b', 'main');
    sh(work, 'init', '-b', 'main');
    sh(work, 'remote', 'add', 'origin', remote);

    writeFileSync(join(work, 'notes.txt'), CLEAN_TEXT + '\n');
    sh(work, 'add', '.');
    sh(work, 'commit', '-m', 'clean base');
    sh(work, 'push', 'origin', 'main');
    const base = sh(work, 'rev-parse', 'HEAD');
    const ZERO = '0'.repeat(40);

    // Clean follow-up commit passes.
    writeFileSync(join(work, 'more.txt'), 'nothing secret here\n');
    sh(work, 'add', '.');
    sh(work, 'commit', '-m', 'clean follow-up');
    const clean = sh(work, 'rev-parse', 'HEAD');
    const okRun = spawnSync(process.execPath, [SCANNER, '--pre-push', 'origin', remote], {
      cwd: work, input: `refs/heads/main ${clean} refs/heads/main ${base}\n`, encoding: 'utf8',
    });
    assert.equal(okRun.status, 0, okRun.stderr);

    // A commit that adds a fake key is blocked, and the report names file and line, not the value.
    writeFileSync(join(work, 'config.js'), `// settings\nexport const key = "${FAKES['anthropic-key']}";\n`);
    sh(work, 'add', '.');
    sh(work, 'commit', '-m', 'leaky commit');
    const leaky = sh(work, 'rev-parse', 'HEAD');
    const badRun = spawnSync(process.execPath, [SCANNER, '--pre-push', 'origin', remote], {
      cwd: work, input: `refs/heads/main ${leaky} refs/heads/main ${base}\n`, encoding: 'utf8',
    });
    assert.equal(badRun.status, 1, badRun.stderr);
    assert.match(badRun.stderr, /\[anthropic-key\] config\.js:2/);
    assert.ok(!badRun.stderr.includes(FAKE), 'report leaked the key body');

    // The same leak is caught when the branch is new on the remote (remote sha all zeros).
    const newBranch = spawnSync(process.execPath, [SCANNER, '--pre-push', 'origin', remote], {
      cwd: work, input: `refs/heads/feature ${leaky} refs/heads/feature ${ZERO}\n`, encoding: 'utf8',
    });
    assert.equal(newBranch.status, 1, newBranch.stderr);

    // Deleting a remote ref pushes no content and is allowed.
    const del = spawnSync(process.execPath, [SCANNER, '--pre-push', 'origin', remote], {
      cwd: work, input: `(delete) ${ZERO} refs/heads/old ${base}\n`, encoding: 'utf8',
    });
    assert.equal(del.status, 0, del.stderr);

    // A key already in history before the pushed range does not block a later clean push.
    sh(work, 'push', 'origin', 'main'); // temp repo has no hook installed, so this is a plain push
    writeFileSync(join(work, 'later.txt'), 'still clean\n');
    sh(work, 'add', '.');
    sh(work, 'commit', '-m', 'clean after leak');
    const later = sh(work, 'rev-parse', 'HEAD');
    const laterRun = spawnSync(process.execPath, [SCANNER, '--pre-push', 'origin', remote], {
      cwd: work, input: `refs/heads/main ${later} refs/heads/main ${leaky}\n`, encoding: 'utf8',
    });
    assert.equal(laterRun.status, 0, laterRun.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
