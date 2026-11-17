import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CHECK_SCRIPT = path.join(__dirname, 'env-names-check.ps1');

function findPowerShell() {
  for (const exe of ['powershell.exe', 'pwsh']) {
    const check = spawnSync(exe, ['-NoProfile', '-Command', '$PSVersionTable.PSVersion.ToString()'], {
      encoding: 'utf8',
    });
    if (check.status === 0) return exe;
  }
  return null;
}

const PS_EXE = findPowerShell();

function makeSyntheticRepo() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-names-check-'));
  const repo = path.join(root, 'repo');
  const envRoot = path.join(root, 'env-root');
  fs.mkdirSync(path.join(repo, 'services', 'alpha'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'services', 'beta'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'node_modules', 'fake'), { recursive: true });
  fs.mkdirSync(path.join(repo, '.git', 'hooks'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'dist', 'out'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'archive', 'old'), { recursive: true });
  fs.mkdirSync(path.join(repo, '.venv', 'lib'), { recursive: true });
  fs.mkdirSync(envRoot, { recursive: true });

  fs.writeFileSync(
    path.join(repo, 'env.required.json'),
    JSON.stringify({
      service: 'root-svc',
      node: 'alienware',
      envFile: '.env',
      required: ['ROOT_TOKEN', 'GEMINI_API_KEY'],
      alternatives: { ROOT_TOKEN: ['FLEET_SHARED_TOKEN'] },
      optional: ['PORT'],
    }),
    'utf8',
  );

  fs.writeFileSync(
    path.join(repo, 'services', 'alpha', 'env.required.json'),
    JSON.stringify({
      service: 'alpha-svc',
      node: 't5500',
      envFile: '.env',
      required: ['ALPHA_KEY', 'ALPHA_SECRET'],
    }),
    'utf8',
  );

  fs.writeFileSync(
    path.join(repo, 'services', 'beta', 'env.required.json'),
    JSON.stringify({
      service: 'beta-svc',
      node: 'all',
      envFile: 'repo:shared.env',
      required: ['SHARED_BETA'],
    }),
    'utf8',
  );

  for (const skip of ['node_modules/fake', '.git/hooks', 'dist/out', 'archive/old', '.venv/lib']) {
    fs.writeFileSync(
      path.join(repo, skip, 'env.required.json'),
      JSON.stringify({
        service: 'should-be-skipped',
        node: 'alienware',
        envFile: '.env',
        required: ['SKIPPED_SECRET'],
      }),
      'utf8',
    );
  }

  return { root, repo, envRoot };
}

test('env-names-check.ps1 parses synthetic .env fixtures strictly by names, honors -ListTargetsOnly/-Node/-EnvRoot/-SoftExit/-Json, and never leaks secrets', { skip: !PS_EXE }, () => {
  assert.ok(fs.existsSync(CHECK_SCRIPT), 'ops/agents/env-names-check.ps1 must exist');
  const fx = makeSyntheticRepo();
  const runtimeSecret1 = ['rt-sec1', Date.now(), Math.random().toString(36).slice(2)].join('-');
  const runtimeSecret2 = ['rt-sec2', Date.now(), Math.random().toString(36).slice(2)].join('-');
  const runtimeSecret3 = ['rt-sec3', Date.now(), Math.random().toString(36).slice(2)].join('-');

  try {
    // Write a canary secret to repo/.env to prove -ListTargetsOnly never reads it
    fs.writeFileSync(path.join(fx.repo, '.env'), `ROOT_TOKEN=${runtimeSecret1}\n`, 'utf8');

    // 1. -ListTargetsOnly with -Json
    const listOut = execFileSync(
      PS_EXE,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', CHECK_SCRIPT, '-RepoRoot', fx.repo, '-ListTargetsOnly', '-Json'],
      { encoding: 'utf8' },
    );
    assert.equal(listOut.includes(runtimeSecret1), false, '-ListTargetsOnly must never echo secret values');
    const listJson = JSON.parse(listOut);
    assert.equal(listJson.ok, true);
    assert.equal(listJson.listTargetsOnly, true);
    assert.deepEqual(
      listJson.services.map((s) => s.service).sort(),
      ['alpha-svc', 'beta-svc', 'root-svc'],
    );

    // 2. -Node t5500 filter includes t5500 + all, excludes alienware
    const t5500Out = execFileSync(
      PS_EXE,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', CHECK_SCRIPT, '-RepoRoot', fx.repo, '-Node', 't5500', '-ListTargetsOnly', '-Json'],
      { encoding: 'utf8' },
    );
    const t5500Json = JSON.parse(t5500Out);
    assert.deepEqual(
      t5500Json.services.map((s) => s.service).sort(),
      ['alpha-svc', 'beta-svc'],
    );

    // 3. Synthetic envRoot with missing, empty quotes, inline comments, export prefix, and alternative satisfaction
    fs.mkdirSync(path.join(fx.envRoot, 'services', 'alpha'), { recursive: true });
    fs.writeFileSync(
      path.join(fx.envRoot, '.env'),
      [
        '# comment line',
        `export FLEET_SHARED_TOKEN="${runtimeSecret1}"`,
        `GEMINI_API_KEY=${runtimeSecret2} # inline comment`,
      ].join('\n') + '\n',
      'utf8',
    );
    fs.writeFileSync(
      path.join(fx.envRoot, 'services', 'alpha', '.env'),
      [
        `ALPHA_KEY=""`,
        `ALPHA_SECRET='   '`,
        `# ALPHA_KEY=${runtimeSecret3}`,
      ].join('\n') + '\n',
      'utf8',
    );
    fs.writeFileSync(path.join(fx.repo, 'shared.env'), `SHARED_BETA=${runtimeSecret3}\n`, 'utf8');

    // Without -SoftExit -> exits 1
    const failRun = spawnSync(
      PS_EXE,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', CHECK_SCRIPT, '-RepoRoot', fx.repo, '-EnvRoot', fx.envRoot],
      { encoding: 'utf8' },
    );
    assert.equal(failRun.status, 1);
    const combinedFail = `${failRun.stdout}\n${failRun.stderr}`;
    for (const sec of [runtimeSecret1, runtimeSecret2, runtimeSecret3]) {
      assert.equal(combinedFail.includes(sec), false, 'Secret value must NEVER appear in stdout or stderr');
    }
    assert.match(failRun.stdout, /\[OK\].*root-svc/);
    assert.match(failRun.stdout, /\[MISSING\].*alpha-svc.*ALPHA_KEY.*ALPHA_SECRET/);
    assert.match(failRun.stdout, /\[OK\].*beta-svc/);

    // With -SoftExit -Json -> exits 0 and emits valid structured JSON with names only
    const jsonRun = spawnSync(
      PS_EXE,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', CHECK_SCRIPT, '-RepoRoot', fx.repo, '-EnvRoot', fx.envRoot, '-SoftExit', '-Json'],
      { encoding: 'utf8' },
    );
    assert.equal(jsonRun.status, 0);
    for (const sec of [runtimeSecret1, runtimeSecret2, runtimeSecret3]) {
      assert.equal(jsonRun.stdout.includes(sec), false, 'Secret value must NEVER appear in JSON output');
      assert.equal(jsonRun.stderr.includes(sec), false, 'Secret value must NEVER appear in stderr');
    }
    const parsed = JSON.parse(jsonRun.stdout);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.missingCount, 1);
    const alpha = parsed.services.find((s) => s.service === 'alpha-svc');
    assert.equal(alpha.status, 'MISSING');
    assert.deepEqual(alpha.missingEnv, ['ALPHA_KEY', 'ALPHA_SECRET']);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('env-names-check.ps1 handles export KEY="super-secret-value", inline # comments, = inside values, and empty keys without leaking any value substring', { skip: !PS_EXE }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'env-names-hardening-'));
  const repo = path.join(root, 'repo');
  const envRoot = path.join(root, 'env-root');
  fs.mkdirSync(repo, { recursive: true });
  fs.mkdirSync(envRoot, { recursive: true });

  const forbiddenSubstrings = [
    'super-secret-value',
    'super-secret',
    'secret-value',
    'inline-secret-token',
    'inline-comment-do-not-leak',
    'postgres://',
    'u:pw=123@host/db',
    'pw=123',
    '123@host',
    'host/db',
    'comment-after-equals-secret',
    'unlisted-top-secret',
    '=xyz',
  ];

  try {
    fs.writeFileSync(
      path.join(repo, 'env.required.json'),
      JSON.stringify({
        service: 'hardening-svc',
        node: 'alienware',
        envFile: '.env',
        required: ['KEY', 'INLINE_VAL', 'DATABASE_URL', 'EMPTY_KEY', 'EMPTY_COMMENT', 'MISSING_KEY'],
      }),
      'utf8',
    );

    fs.writeFileSync(
      path.join(envRoot, '.env'),
      [
        'export KEY="super-secret-value"',
        'INLINE_VAL=inline-secret-token # inline-comment-do-not-leak',
        'DATABASE_URL=postgres://u:pw=123@host/db',
        'EMPTY_KEY=',
        'EMPTY_COMMENT=# comment-after-equals-secret',
        'UNLISTED_TOKEN="unlisted-top-secret=xyz"',
      ].join('\n') + '\n',
      'utf8',
    );

    const textRun = spawnSync(
      PS_EXE,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', CHECK_SCRIPT, '-RepoRoot', repo, '-EnvRoot', envRoot],
      { encoding: 'utf8' },
    );
    assert.equal(textRun.status, 1);
    const textCombined = `${textRun.stdout}\n${textRun.stderr}`;
    for (const sub of forbiddenSubstrings) {
      assert.equal(textCombined.includes(sub), false, `stdout/stderr must never leak value substring: ${sub}`);
    }
    assert.match(
      textRun.stdout,
      /\[MISSING\] hardening-svc \(\.env\): missing required setting names: EMPTY_KEY, EMPTY_COMMENT, MISSING_KEY\r?\n?$/,
    );

    const jsonRun = spawnSync(
      PS_EXE,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', CHECK_SCRIPT, '-RepoRoot', repo, '-EnvRoot', envRoot, '-SoftExit', '-Json'],
      { encoding: 'utf8' },
    );
    assert.equal(jsonRun.status, 0);
    const jsonCombined = `${jsonRun.stdout}\n${jsonRun.stderr}`;
    for (const sub of forbiddenSubstrings) {
      assert.equal(jsonCombined.includes(sub), false, `-Json output must never leak value substring: ${sub}`);
    }
    const parsed = JSON.parse(jsonRun.stdout);
    assert.equal(parsed.ok, false);
    assert.equal(parsed.missingCount, 1);
    assert.equal(parsed.services.length, 1);
    assert.equal(parsed.services[0].status, 'MISSING');
    assert.deepEqual(parsed.services[0].missingEnv, ['EMPTY_KEY', 'EMPTY_COMMENT', 'MISSING_KEY']);

    // When only KEY, INLINE_VAL, DATABASE_URL are required, all 3 satisfy [OK] with zero leaks
    fs.writeFileSync(
      path.join(repo, 'env.required.json'),
      JSON.stringify({
        service: 'hardening-svc',
        node: 'alienware',
        envFile: '.env',
        required: ['KEY', 'INLINE_VAL', 'DATABASE_URL'],
      }),
      'utf8',
    );
    const okRun = spawnSync(
      PS_EXE,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', CHECK_SCRIPT, '-RepoRoot', repo, '-EnvRoot', envRoot, '-Json'],
      { encoding: 'utf8' },
    );
    assert.equal(okRun.status, 0);
    const okCombined = `${okRun.stdout}\n${okRun.stderr}`;
    for (const sub of forbiddenSubstrings) {
      assert.equal(okCombined.includes(sub), false, `OK -Json output must never leak value substring: ${sub}`);
    }
    const okParsed = JSON.parse(okRun.stdout);
    assert.equal(okParsed.ok, true);
    assert.equal(okParsed.missingCount, 0);
    assert.deepEqual(okParsed.services[0].missingEnv, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
