import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES, ALLOW_MARKER, scanText, scanPush } from './secret-scan.mjs';

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
  'generic-sk-key': ['sk', '-', 'proj', '-', FAKE].join(''),
  'windows-user-path': ['C', ':', '\\', 'Users', '\\', 'dummyuser'].join(''),
  'private-ipv4': ['192', '.', '168', '.', '1', '.', '100'].join(''),
  'private-ipv4 (10.)': ['10', '.', '0', '.', '0', '.', '1'].join(''),
  'private-ipv4 (172.16-31)': ['172', '.', '16', '.', '0', '.', '1'].join(''),
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

test('rule generic-sk-key: blocks generic sk- key shape of 20 or more characters and allows short keys', () => {
  const fakeKey = ['sk', '-', 'proj', '-', FAKE].join('');
  const fake20Chars = ['sk', '-', '12345678901234567890'].join('');
  const shortKey = ['sk', '-', 'short'].join('');
  const antKey = ['sk', '-', 'ant', '-', 'api03-', FAKE].join('');

  assert.ok(scanText(fakeKey).some((f) => f.rule === 'generic-sk-key'));
  assert.ok(scanText(fake20Chars).some((f) => f.rule === 'generic-sk-key'));
  assert.deepEqual(scanText(shortKey), []);
  assert.ok(scanText(antKey).some((f) => f.rule === 'anthropic-key'));
  assert.ok(!scanText(antKey).some((f) => f.rule === 'generic-sk-key'));
});

test('rule windows-user-path: blocks Windows user folder path without literal real name', () => {
  const fakePathWin = ['C', ':', '\\', 'Users', '\\', 'dummyuser', '\\', 'project'].join('');
  const fakePathFwd = ['c', ':', '/', 'users', '/', 'dummyuser'].join('');
  const safeProfile = '%USERPROFILE%\\antigravity';
  assert.ok(scanText(fakePathWin).some((f) => f.rule === 'windows-user-path'));
  assert.ok(scanText(fakePathFwd).some((f) => f.rule === 'windows-user-path'));
  assert.deepEqual(scanText(safeProfile), []);
});

test('rule private-ipv4: blocks 192.168, 10 and 172.16-31 ranges and permits public/docs IPs', () => {
  const fake192 = ['http://', '192', '.', '168', '.', '1', '.', '42', ':8080'].join('');
  const fake10 = ['10', '.', '200', '.', '0', '.', '1'].join('');
  const fake172 = ['172', '.', '20', '.', '5', '.', '6'].join('');
  const docIp = '192.0.2.1';
  const public172 = '172.15.0.1';
  const localhost = '127.0.0.1';
  assert.ok(scanText(fake192).some((f) => f.rule === 'private-ipv4'));
  assert.ok(scanText(fake10).some((f) => f.rule === 'private-ipv4'));
  assert.ok(scanText(fake172).some((f) => f.rule === 'private-ipv4'));
  assert.deepEqual(scanText(docIp), []);
  assert.deepEqual(scanText(public172), []);
  assert.deepEqual(scanText(localhost), []);
});

test('Finding 4.8: option-injection token rejected before any git call', () => {
  const badInput = 'refs/heads/test --max-count=0 refs/heads/test 0000000000000000000000000000000000000000\n';
  assert.throws(() => scanPush(badInput), /invalid SHA in pre-push input/);

  const res = spawnSync(process.execPath, [SCANNER, '--pre-push', 'origin', 'fake-url'], {
    input: badInput,
    encoding: 'utf8',
  });
  assert.equal(res.status, 2);
  assert.match(res.stderr, /invalid SHA/);
});

test('Finding 4.8: new branch with commits already on a non-main remote branch is still scanned', () => {
  const root = mkdtempSync(join(tmpdir(), 'secret-scan-test-non-main-'));
  try {
    const remote = join(root, 'remote.git');
    const work = join(root, 'work');
    mkdirSync(remote);
    mkdirSync(work);
    sh(remote, 'init', '--bare', '-b', 'main');
    sh(work, 'init', '-b', 'main');
    sh(work, 'remote', 'add', 'origin', remote);

    // Initial clean commit on main
    writeFileSync(join(work, 'readme.txt'), 'clean readme\n');
    sh(work, 'add', '.');
    sh(work, 'commit', '-m', 'clean main');
    sh(work, 'push', 'origin', 'main');

    // Create feature-a with a secret and push it to origin/feature-a
    sh(work, 'checkout', '-b', 'feature-a');
    writeFileSync(join(work, 'leak.txt'), `export const apiKey = "${FAKES['anthropic-key']}";\n`);
    sh(work, 'add', '.');
    sh(work, 'commit', '-m', 'commit with secret on feature-a');
    sh(work, 'push', 'origin', 'feature-a');
    const leakySha = sh(work, 'rev-parse', 'HEAD');

    // Create a new branch feature-b off feature-a (so the leaky commit is already on remote branch origin/feature-a)
    sh(work, 'checkout', '-b', 'feature-b');
    const ZERO = '0'.repeat(40);

    // Push feature-b as a new branch (remote sha 40 zeroes).
    // Because the commit is NOT on origin/main, it must NOT be exempt and MUST be blocked.
    const res = spawnSync(process.execPath, [SCANNER, '--pre-push', 'origin', remote], {
      cwd: work,
      input: `refs/heads/feature-b ${leakySha} refs/heads/feature-b ${ZERO}\n`,
      encoding: 'utf8',
    });
    assert.equal(res.status, 1, res.stderr);
    assert.match(res.stderr, /\[anthropic-key\]/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('Finding 4.8: new branch with commits on origin/main skips those', () => {
  const root = mkdtempSync(join(tmpdir(), 'secret-scan-test-skip-main-'));
  try {
    const remote = join(root, 'remote.git');
    const work = join(root, 'work');
    mkdirSync(remote);
    mkdirSync(work);
    sh(remote, 'init', '--bare', '-b', 'main');
    sh(work, 'init', '-b', 'main');
    sh(work, 'remote', 'add', 'origin', remote);

    // Main has historical commit with a key
    writeFileSync(join(work, 'public-main.txt'), `const oldKey = "${FAKES['anthropic-key']}";\n`);
    sh(work, 'add', '.');
    sh(work, 'commit', '-m', 'already public on main');
    sh(work, 'push', 'origin', 'main');

    // New branch feature-c off main has only clean additions
    sh(work, 'checkout', '-b', 'feature-c');
    writeFileSync(join(work, 'feature-c.txt'), 'clean new feature code\n');
    sh(work, 'add', '.');
    sh(work, 'commit', '-m', 'clean feature commit');
    const cleanSha = sh(work, 'rev-parse', 'HEAD');
    const ZERO = '0'.repeat(40);

    // Pushing new branch feature-c (remote sha 40 zeroes) skips commits already on origin/main
    const res = spawnSync(process.execPath, [SCANNER, '--pre-push', 'origin', remote], {
      cwd: work,
      input: `refs/heads/feature-c ${cleanSha} refs/heads/feature-c ${ZERO}\n`,
      encoding: 'utf8',
    });
    assert.equal(res.status, 0, res.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
