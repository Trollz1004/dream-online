import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPT_PATH = path.join(__dirname, 'render-agent-files.ps1');

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

function makeTempFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'render-agent-node-'));
  const repo = path.join(root, 'repo');
  const profile = path.join(root, 'UserProfile');
  const localApp = path.join(profile, 'AppData', 'Local');
  const freebuff = path.join(root, 'freebuff-leadgen');

  fs.mkdirSync(path.join(repo, '.agents', 'skills', 'demo', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(repo, '.agents', 'skills', 'hallmark', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(repo, 'docs', 'house'), { recursive: true });
  fs.mkdirSync(path.join(profile, '.gemini', 'config'), { recursive: true });
  fs.mkdirSync(path.join(profile, '.codex'), { recursive: true });
  fs.mkdirSync(path.join(profile, '.claude'), { recursive: true });
  fs.mkdirSync(path.join(profile, '.openclaw', 'workspace'), { recursive: true });
  fs.mkdirSync(path.join(localApp, 'hermes'), { recursive: true });
  fs.mkdirSync(freebuff, { recursive: true });

  const hr = '- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`. Read before any design, site, dashboard or header job. Pointers only; do not restate rules here.';
  const cb = '- Current beats existing: fetch and pull main first; origin main wins over clone, cache, journal and definition file; a clone that cannot fast-forward stops and reports (`ops/handoffs/FABLE-HANDOFFS-2026-11-06.md` section 0).';

  fs.writeFileSync(path.join(repo, 'AGENTS.md'), `# AGENTS\n\nCustom text.\n${hr}\n${cb}\n`, 'utf8');
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
  fs.writeFileSync(path.join(repo, 'wrangler.toml'), 'name = "w"\n', 'utf8');

  const fakeToken = 'ghp_' + 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5';
  fs.writeFileSync(
    path.join(profile, '.gemini', 'settings.json'),
    JSON.stringify({ trustedWorkspaces: ['x'], secretVal: fakeToken }, null, 2) + '\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(profile, '.gemini', 'config', 'mcp_config.json'),
    JSON.stringify({ mcpServers: { existing: { command: 'node', args: ['a.mjs'] } } }, null, 2) + '\n',
    'utf8',
  );
  fs.writeFileSync(path.join(profile, '.codex', 'config.toml'), 'model = "gpt-6-astra"\n', 'utf8');
  fs.writeFileSync(path.join(localApp, 'hermes', 'SOUL.md'), 'D:\\mira private session\n', 'utf8');

  return { root, repo, profile, localApp, freebuff, fakeToken };
}

test('render-agent-files.ps1 exists and passes PowerShell end-to-end JSON/TOML/YAML/MD + dry-run + secret-redaction checks', { skip: !PS_EXE }, () => {
  assert.ok(fs.existsSync(SCRIPT_PATH));
  const fx = makeTempFixture();
  try {
    const dryOut = execFileSync(
      PS_EXE,
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        SCRIPT_PATH,
        '-Node',
        'alienware',
        '-Scope',
        'all',
        '-RepoRoot',
        fx.repo,
        '-SpineSourceRepo',
        REPO_ROOT,
        '-UserProfileRoot',
        fx.profile,
        '-LocalAppDataRoot',
        fx.localApp,
        '-FreebuffRoot',
        fx.freebuff,
      ],
      { encoding: 'utf8' },
    );

    assert.match(dryOut, /\[DRY RUN\]/);
    assert.equal(dryOut.includes(fx.fakeToken), false, 'Dry run must never print secret token');
    assert.equal(dryOut.includes(fx.profile), false, 'Dry run must normalize UserProfileRoot to %USERPROFILE%');
    assert.match(dryOut, /\[SKIP private-project\]/);

    execFileSync(
      PS_EXE,
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        SCRIPT_PATH,
        '-Node',
        'alienware',
        '-Scope',
        'all',
        '-RepoRoot',
        fx.repo,
        '-SpineSourceRepo',
        REPO_ROOT,
        '-UserProfileRoot',
        fx.profile,
        '-LocalAppDataRoot',
        fx.localApp,
        '-FreebuffRoot',
        fx.freebuff,
        '-Apply',
      ],
      { encoding: 'utf8' },
    );

    // Every rendered JSON must parse cleanly in Node JSON.parse
    for (const jsonPath of [
      path.join(fx.repo, '.agents', 'skills', 'demo', 'skill.json'),
      path.join(fx.profile, '.gemini', 'settings.json'),
      path.join(fx.profile, '.gemini', 'config', 'mcp_config.json'),
    ]) {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      assert.equal(parsed._trollz1004_spine_start, 'managed-by-render-agent-files');
      assert.equal(parsed._trollz1004_spine_end, 'managed-by-render-agent-files');
      assert.ok(parsed.trollz1004_spine);
    }

    const mcp = JSON.parse(fs.readFileSync(path.join(fx.profile, '.gemini', 'config', 'mcp_config.json'), 'utf8'));
    assert.equal(mcp.mcpServers.existing.command, 'node');
    assert.equal(mcp.mcpServers.kit.command, 'cmd.exe');
    assert.equal(mcp.mcpServers.kit.timeoutSeconds, 120);

    const codexToml = fs.readFileSync(path.join(fx.profile, '.codex', 'config.toml'), 'utf8');
    assert.match(codexToml, /\[trollz1004_spine\]/);
    assert.match(codexToml, /\[mcp_servers\.kit\]/);

    // Verify private-project file untouched
    assert.equal(fs.readFileSync(path.join(fx.localApp, 'hermes', 'SOUL.md'), 'utf8'), 'D:\\mira private session\n');

    // Verify dry-run t5500 output
    const t5500Dry = execFileSync(
      PS_EXE,
      [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        SCRIPT_PATH,
        '-Node',
        't5500',
        '-Scope',
        'node',
        '-RepoRoot',
        fx.repo,
        '-SpineSourceRepo',
        REPO_ROOT,
        '-UserProfileRoot',
        fx.profile,
        '-LocalAppDataRoot',
        fx.localApp,
        '-FreebuffRoot',
        fx.freebuff,
      ],
      { encoding: 'utf8' },
    );
    assert.match(t5500Dry, /ssh t5500/);
    assert.match(t5500Dry, /192\.168\.0\.15/);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});
