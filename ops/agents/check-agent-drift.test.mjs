import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const RENDER_SCRIPT = path.join(__dirname, 'render-agent-files.ps1');
const DRIFT_SCRIPT = path.join(__dirname, 'check-agent-drift.ps1');

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

function makeDriftFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-agent-drift-'));
  const repo = path.join(root, 'repo');
  const profile = path.join(root, 'UserProfile');
  const localApp = path.join(profile, 'AppData', 'Local');
  const freebuff = path.join(root, 'freebuff-leadgen');
  const statusJson = path.join(root, 'status', 'agent-drift.json');

  fs.mkdirSync(path.join(repo, '.agents', 'skills', 'demo', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(repo, '.agents', 'skills', 'hallmark', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'docs', 'house'), { recursive: true });
  fs.mkdirSync(path.join(profile, '.gemini', 'config'), { recursive: true });
  fs.mkdirSync(path.join(profile, '.codex'), { recursive: true });
  fs.mkdirSync(path.join(profile, '.claude'), { recursive: true });
  fs.mkdirSync(path.join(localApp, 'hermes'), { recursive: true });
  fs.mkdirSync(freebuff, { recursive: true });

  const hr = '- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.';
  const cb = '- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).';

  fs.writeFileSync(path.join(repo, 'AGENTS.md'), `# AGENTS\n\nBody.\n${hr}\n${cb}\n`, 'utf8');
  fs.writeFileSync(
    path.join(repo, '.agents', 'skills', 'demo', 'skill.json'),
    JSON.stringify({ house_rules: 'docs/house/HOUSE-MOTION-RULE.md', name: 'demo' }, null, 2) + '\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(repo, '.agents', 'skills', 'demo', 'agents', 'gemini.toml'),
    'name = "demo"\nhouse_rules = "docs/house/HOUSE-MOTION-RULE.md"\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(repo, '.agents', 'skills', 'demo', 'agents', 'openai.yaml'),
    'name: demo\nhouse_rules: "docs/house/HOUSE-MOTION-RULE.md"\n',
    'utf8',
  );
  fs.writeFileSync(path.join(repo, '.agents', 'skills', 'hallmark', 'SKILL.md'), 'vendored\n', 'utf8');
  fs.writeFileSync(path.join(profile, '.gemini', 'GEMINI.md'), '# Gemini\n', 'utf8');
  fs.writeFileSync(
    path.join(profile, '.gemini', 'settings.json'),
    JSON.stringify({ trustedWorkspaces: ['x'] }, null, 2) + '\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(profile, '.gemini', 'config', 'mcp_config.json'),
    JSON.stringify({ mcpServers: {} }, null, 2) + '\n',
    'utf8',
  );
  fs.writeFileSync(path.join(profile, '.codex', 'config.toml'), 'model = "gpt-6-astra"\n', 'utf8');
  fs.writeFileSync(path.join(profile, '.codex', 'AGENTS.md'), '# Codex Agents\n', 'utf8');
  fs.writeFileSync(path.join(profile, '.claude', 'CLAUDE.md'), '# Claude\n', 'utf8');
  fs.writeFileSync(path.join(localApp, 'hermes', 'ALIENWARE-SOUL.md'), '# Alienware Soul\n', 'utf8');
  fs.writeFileSync(path.join(localApp, 'hermes', 'SOUL.md'), 'Workspace D:\\mira — Legal NSFW only.\n', 'utf8');
  fs.writeFileSync(path.join(freebuff, 'AGENTS.md'), '# Freebuff Agents\n', 'utf8');
  fs.writeFileSync(path.join(freebuff, 'CLAUDE.md'), '# Freebuff Claude\n', 'utf8');
  fs.writeFileSync(path.join(freebuff, 'GEMINI.md'), '# Freebuff Gemini\n', 'utf8');

  return { root, repo, profile, localApp, freebuff, statusJson };
}

test('check-agent-drift.ps1 classifies missing, missing-block, and drifted files, writes UTF-8 no-BOM JSON, and respects -SoftExit / -NoWriteStatus', { skip: !PS_EXE }, () => {
  assert.ok(fs.existsSync(DRIFT_SCRIPT), 'ops/agents/check-agent-drift.ps1 must exist');
  const fx = makeDriftFixture();
  try {
    // 1. Render cleanly first
    execFileSync(
      PS_EXE,
      [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', RENDER_SCRIPT,
        '-Node', 'alienware', '-Scope', 'all',
        '-RepoRoot', fx.repo, '-SpineSourceRepo', REPO_ROOT,
        '-UserProfileRoot', fx.profile, '-LocalAppDataRoot', fx.localApp,
        '-FreebuffRoot', fx.freebuff, '-Apply',
      ],
      { encoding: 'utf8' },
    );

    // Clean check exits 0 and writes light: green
    const cleanOut = execFileSync(
      PS_EXE,
      [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', DRIFT_SCRIPT,
        '-Node', 'alienware', '-Scope', 'all',
        '-RepoRoot', fx.repo, '-SpineSourceRepo', REPO_ROOT,
        '-UserProfileRoot', fx.profile, '-LocalAppDataRoot', fx.localApp,
        '-FreebuffRoot', fx.freebuff, '-StatusJsonPath', fx.statusJson,
      ],
      { encoding: 'utf8' },
    );
    assert.match(cleanOut, /light=green/);
    assert.match(cleanOut, /\[SKIP private-project\]/);

    const cleanBuf = fs.readFileSync(fx.statusJson);
    assert.equal(cleanBuf[0] === 0xef && cleanBuf[1] === 0xbb && cleanBuf[2] === 0xbf, false, 'Status JSON must not have UTF-8 BOM');
    const cleanJson = JSON.parse(cleanBuf.toString('utf8'));
    assert.equal(cleanJson.node, 'alienware');
    assert.equal(cleanJson.ok, true);
    assert.equal(cleanJson.light, 'green');
    assert.equal(cleanJson.driftedCount, 0);
    assert.deepEqual(cleanJson.driftedFiles, []);

    // 2. Introduce all 3 drift classes: missing, missing-block, drifted
    fs.rmSync(path.join(fx.profile, '.codex', 'AGENTS.md'));
    fs.writeFileSync(path.join(fx.profile, '.claude', 'CLAUDE.md'), '# Claude without block\n', 'utf8');
    const staleAgents = fs.readFileSync(path.join(fx.repo, 'AGENTS.md'), 'utf8').replace('192.168.0.40', '192.168.0.99');
    fs.writeFileSync(path.join(fx.repo, 'AGENTS.md'), staleAgents, 'utf8');

    // -NoWriteStatus must not overwrite existing status file
    const driftedNoWrite = spawnSync(
      PS_EXE,
      [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', DRIFT_SCRIPT,
        '-Node', 'alienware', '-Scope', 'all',
        '-RepoRoot', fx.repo, '-SpineSourceRepo', REPO_ROOT,
        '-UserProfileRoot', fx.profile, '-LocalAppDataRoot', fx.localApp,
        '-FreebuffRoot', fx.freebuff, '-StatusJsonPath', fx.statusJson,
        '-NoWriteStatus',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(driftedNoWrite.status, 1, 'Drifted check without -SoftExit must exit 1');
    assert.equal(driftedNoWrite.stdout.includes(fx.profile), false, 'Output must not leak literal UserProfileRoot');
    assert.match(driftedNoWrite.stdout, /AGENTS\.md/);
    assert.match(driftedNoWrite.stdout, /%USERPROFILE%\\\.claude\\CLAUDE\.md/);
    assert.match(driftedNoWrite.stdout, /%USERPROFILE%\\\.codex\\AGENTS\.md/);
    assert.equal(JSON.parse(fs.readFileSync(fx.statusJson, 'utf8')).light, 'green', '-NoWriteStatus must leave status file untouched');

    // -SoftExit exits 0 and writes light: amber with all 3 classified reasons
    const softRun = spawnSync(
      PS_EXE,
      [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', DRIFT_SCRIPT,
        '-Node', 'alienware', '-Scope', 'all',
        '-RepoRoot', fx.repo, '-SpineSourceRepo', REPO_ROOT,
        '-UserProfileRoot', fx.profile, '-LocalAppDataRoot', fx.localApp,
        '-FreebuffRoot', fx.freebuff, '-StatusJsonPath', fx.statusJson,
        '-SoftExit',
      ],
      { encoding: 'utf8' },
    );
    assert.equal(softRun.status, 0, '-SoftExit must exit 0 even when drifted');
    const driftedJson = JSON.parse(fs.readFileSync(fx.statusJson, 'utf8'));
    assert.equal(driftedJson.ok, false);
    assert.equal(driftedJson.light, 'amber');
    assert.equal(driftedJson.driftedCount, 3);
    assert.ok(Array.isArray(driftedJson.driftedFiles));

    const byFile = new Map(driftedJson.driftedFiles.map((d) => [d.file, d.reason]));
    assert.equal(byFile.get('AGENTS.md'), 'drifted');
    assert.equal(byFile.get('%USERPROFILE%\\.claude\\CLAUDE.md'), 'missing-block');
    assert.equal(byFile.get('%USERPROFILE%\\.codex\\AGENTS.md'), 'missing');
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});
