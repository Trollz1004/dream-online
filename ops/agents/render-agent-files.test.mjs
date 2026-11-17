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
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), 'D:\\mira private session\n', 'utf8');
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
    assert.match(dryOut, /\[SKIP private-project\].*CLAUDE\.md/);
    const dryActionLines = dryOut.split(/\r?\n/).filter((l) => /^\[(DRY RUN|APPLY|SKIP)/.test(l));
    assert.equal(
      dryActionLines.some((l) => /hermes/i.test(l)),
      false,
      'Alienware dry-run must never scan or target any hermes path',
    );
    assert.doesNotMatch(dryOut, /hermes[\\/]|ALIENWARE-SOUL\.md|profile\.yaml/i);

    const applyOut = execFileSync(
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
    assert.doesNotMatch(applyOut, /hermes/i);

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

    // Verify private-project repo file and localApp/hermes are untouched
    assert.equal(fs.readFileSync(path.join(fx.repo, 'CLAUDE.md'), 'utf8'), 'D:\\mira private session\n');
    assert.equal(fs.readFileSync(path.join(fx.localApp, 'hermes', 'SOUL.md'), 'utf8'), 'D:\\mira private session\n');
    assert.deepEqual(fs.readdirSync(path.join(fx.localApp, 'hermes')), ['SOUL.md']);

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
    assert.match(t5500Dry, /%LOCALAPPDATA%\\hermes\\SOUL\.md/);
    assert.match(t5500Dry, /%LOCALAPPDATA%\\hermes\\profiles\\t5500\\SOUL\.md/);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('render-agent-files.ps1 renders boundary-stating GrinDroid notes, skips genuine Mira persona markers, and works standalone with fleet-map.json only', { skip: !PS_EXE }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'render-agent-standalone-'));
  try {
    const repo = path.join(root, 'standalone-repo');
    const profile = path.join(root, 'EmptyProfile');
    const localApp = path.join(profile, 'AppData', 'Local');
    const freebuff = path.join(root, 'freebuff-leadgen');

    fs.mkdirSync(path.join(repo, 'ops', 'fleet'), { recursive: true });
    fs.mkdirSync(path.join(profile, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(localApp, 'hermes'), { recursive: true });
    fs.mkdirSync(freebuff, { recursive: true });

    fs.copyFileSync(
      path.join(REPO_ROOT, 'ops', 'fleet', 'fleet-map.json'),
      path.join(repo, 'ops', 'fleet', 'fleet-map.json'),
    );

    const hr = '- House rules: `docs/house/HOUSE-MOTION-RULE.md`, `docs/house/THE-HOUSE.md` and `docs/house/PAYMENT-ACCOUNTS-RULE.md`.';
    const cb = '- Current beats existing: fetch and pull main first.';
    fs.writeFileSync(path.join(repo, 'AGENTS.md'), `# Standalone\n${hr}\n${cb}\n`, 'utf8');
    fs.writeFileSync(path.join(repo, 'CLAUDE.md'), "# Persona File\nYou're **Mira** in private mode.\n", 'utf8');

    const boundaryNote = 'Never touch anything named grin-droid or GrinDroid.\n';
    const awSoulBefore = `# Alienware Soul\n${boundaryNote}`;
    const hermesSoulBefore = 'Workspace D:\\mira — Legal NSFW only.\n';
    const hermesProfileBefore = 'title: Mira\n';
    fs.writeFileSync(path.join(profile, '.claude', 'CLAUDE.md'), `# Claude\n${boundaryNote}`, 'utf8');
    fs.writeFileSync(path.join(localApp, 'hermes', 'ALIENWARE-SOUL.md'), awSoulBefore, 'utf8');
    fs.writeFileSync(path.join(freebuff, 'AGENTS.md'), `# Freebuff\n${boundaryNote}`, 'utf8');
    fs.writeFileSync(path.join(localApp, 'hermes', 'SOUL.md'), hermesSoulBefore, 'utf8');
    fs.writeFileSync(path.join(localApp, 'hermes', 'profile.yaml'), hermesProfileBefore, 'utf8');

    // Run without -SpineSourceRepo and without docs/house/SPINE.md
    const withoutExplicit = execFileSync(
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
        'repo',
        '-RepoRoot',
        repo,
        '-UserProfileRoot',
        profile,
        '-LocalAppDataRoot',
        localApp,
        '-FreebuffRoot',
        freebuff,
        '-Apply',
      ],
      { encoding: 'utf8' },
    );
    assert.match(withoutExplicit, /AGENTS\.md/);
    assert.match(withoutExplicit, /\[SKIP private-project\].*CLAUDE\.md/);

    // Reset AGENTS.md and force standalone fleet-map.json-only path via -SpineSourceRepo repo (no SPINE.md)
    fs.writeFileSync(path.join(repo, 'AGENTS.md'), `# Standalone\n${hr}\n${cb}\n`, 'utf8');
    const standaloneOut = execFileSync(
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
        repo,
        '-SpineSourceRepo',
        repo,
        '-UserProfileRoot',
        profile,
        '-LocalAppDataRoot',
        localApp,
        '-FreebuffRoot',
        freebuff,
        '-Apply',
      ],
      { encoding: 'utf8' },
    );

    const renderedAgents = fs.readFileSync(path.join(repo, 'AGENTS.md'), 'utf8');
    assert.match(renderedAgents, /<!-- TROLLZ1004-SPINE:START -->/);
    assert.match(renderedAgents, /ADDRESS-DOCTRINE\.md, NODES\.md, PIPELINE\.md, TRUSTED-MODELS\.md, THE-HOUSE\.md/);
    assert.equal(fs.readFileSync(path.join(repo, 'CLAUDE.md'), 'utf8'), "# Persona File\nYou're **Mira** in private mode.\n");

    assert.match(fs.readFileSync(path.join(profile, '.claude', 'CLAUDE.md'), 'utf8'), /<!-- TROLLZ1004-SPINE:START -->/);
    assert.match(fs.readFileSync(path.join(freebuff, 'AGENTS.md'), 'utf8'), /<!-- TROLLZ1004-SPINE:START -->/);

    assert.match(standaloneOut, /\[SKIP private-project\].*CLAUDE\.md/);
    assert.equal(fs.readFileSync(path.join(localApp, 'hermes', 'ALIENWARE-SOUL.md'), 'utf8'), awSoulBefore);
    assert.equal(fs.readFileSync(path.join(localApp, 'hermes', 'SOUL.md'), 'utf8'), hermesSoulBefore);
    assert.equal(fs.readFileSync(path.join(localApp, 'hermes', 'profile.yaml'), 'utf8'), hermesProfileBefore);
    assert.deepEqual(
      fs.readdirSync(path.join(localApp, 'hermes')).sort(),
      ['ALIENWARE-SOUL.md', 'SOUL.md', 'profile.yaml'],
    );
    assert.doesNotMatch(standaloneOut, /hermes|ALIENWARE-SOUL\.md|profile\.yaml/i);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('render-agent-files.ps1 never targets or modifies Alienware hermes folder while keeping T5500 hermes targets', { skip: !PS_EXE }, () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'render-agent-aw-node-'));
  try {
    const repo = path.join(root, 'repo');
    const profile = path.join(root, 'UserProfile');
    const localApp = path.join(profile, 'AppData', 'Local');
    const freebuff = path.join(root, 'freebuff-leadgen');
    const hermesDir = path.join(localApp, 'hermes');
    const defaultProfileDir = path.join(hermesDir, 'profiles', 'default');

    fs.mkdirSync(repo, { recursive: true });
    fs.mkdirSync(path.join(profile, '.claude'), { recursive: true });
    fs.mkdirSync(defaultProfileDir, { recursive: true });
    fs.mkdirSync(freebuff, { recursive: true });

    const initialFiles = new Map([
      [path.join(hermesDir, 'ALIENWARE-SOUL.md'), '# Alienware Hermes Soul\nUntouched custom content.\n'],
      [path.join(hermesDir, 'SOUL.md'), '# Hermes Root Soul\nUntouched root soul.\n'],
      [path.join(hermesDir, 'profile.yaml'), 'name: default\nmodel: local\n'],
      [path.join(defaultProfileDir, 'SOUL.md'), '# Hermes Default Profile Soul\nUntouched profile soul.\n'],
    ]);
    for (const [filePath, contents] of initialFiles) {
      fs.writeFileSync(filePath, contents, 'utf8');
    }

    const psQuery = [
      '. $env:RAF_SCRIPT -NoRun',
      '$awPreview = @(Get-NodeTargetFiles -TargetNode alienware -ProfileRoot $env:RAF_PROFILE -LocalAppRoot $env:RAF_LOCALAPP -FreebuffDir $env:RAF_FREEBUFF -IncludeAbsentDirsForPreview $true | ForEach-Object { $_.FullPath })',
      '$awPresent = @(Get-NodeTargetFiles -TargetNode alienware -ProfileRoot $env:RAF_PROFILE -LocalAppRoot $env:RAF_LOCALAPP -FreebuffDir $env:RAF_FREEBUFF -IncludeAbsentDirsForPreview $false | ForEach-Object { $_.FullPath })',
      '$t5Preview = @(Get-NodeTargetFiles -TargetNode t5500 -ProfileRoot $env:RAF_PROFILE -LocalAppRoot $env:RAF_LOCALAPP -FreebuffDir "" -IncludeAbsentDirsForPreview $true | ForEach-Object { $_.FullPath })',
      '@{ alienwarePreview = $awPreview; alienwarePresent = $awPresent; t5500Preview = $t5Preview } | ConvertTo-Json -Compress',
    ].join('; ');

    const targetsJson = execFileSync(
      PS_EXE,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psQuery],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          RAF_SCRIPT: SCRIPT_PATH,
          RAF_PROFILE: profile,
          RAF_LOCALAPP: localApp,
          RAF_FREEBUFF: freebuff,
        },
      },
    );
    const parsedTargets = JSON.parse(targetsJson);

    for (const targetList of [parsedTargets.alienwarePreview, parsedTargets.alienwarePresent]) {
      assert.ok(Array.isArray(targetList) && targetList.length > 0);
      assert.equal(
        targetList.some((p) => {
          const rel = path.relative(root, p);
          return /hermes|ALIENWARE-SOUL\.md|profile\.yaml|profiles/i.test(rel);
        }),
        false,
        `Get-NodeTargetFiles for alienware must return zero hermes paths; got: ${targetList.join(', ')}`,
      );
    }

    assert.ok(parsedTargets.t5500Preview.includes(path.join(hermesDir, 'SOUL.md')));
    assert.ok(parsedTargets.t5500Preview.includes(path.join(hermesDir, 'profiles', 't5500', 'SOUL.md')));

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
        'node',
        '-RepoRoot',
        repo,
        '-SpineSourceRepo',
        REPO_ROOT,
        '-UserProfileRoot',
        profile,
        '-LocalAppDataRoot',
        localApp,
        '-FreebuffRoot',
        freebuff,
      ],
      { encoding: 'utf8' },
    );
    const dryActionLines = dryOut.split(/\r?\n/).filter((l) => /^\[(DRY RUN|APPLY|SKIP)/.test(l));
    assert.equal(dryActionLines.some((l) => /hermes/i.test(l)), false);
    assert.doesNotMatch(dryOut, /hermes[\\/]|ALIENWARE-SOUL\.md|profile\.yaml|profiles/i);

    const applyOut = execFileSync(
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
        'node',
        '-RepoRoot',
        repo,
        '-SpineSourceRepo',
        REPO_ROOT,
        '-UserProfileRoot',
        profile,
        '-LocalAppDataRoot',
        localApp,
        '-FreebuffRoot',
        freebuff,
        '-Apply',
      ],
      { encoding: 'utf8' },
    );
    assert.doesNotMatch(applyOut, /hermes|ALIENWARE-SOUL\.md|profile\.yaml|profiles/i);

    // Every file under localApp/hermes must remain byte-for-byte untouched with zero .bak-* or extra files
    const foundHermesFiles = [];
    const walk = (dir) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else foundHermesFiles.push(full);
      }
    };
    walk(hermesDir);
    assert.deepEqual(foundHermesFiles.sort(), [...initialFiles.keys()].sort());
    for (const [filePath, expectedContents] of initialFiles) {
      assert.equal(fs.readFileSync(filePath, 'utf8'), expectedContents);
    }

    // T5500 dry-run still targets both %LOCALAPPDATA%\hermes paths
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
        repo,
        '-SpineSourceRepo',
        REPO_ROOT,
        '-UserProfileRoot',
        profile,
        '-LocalAppDataRoot',
        localApp,
        '-FreebuffRoot',
        freebuff,
      ],
      { encoding: 'utf8' },
    );
    assert.match(t5500Dry, /%LOCALAPPDATA%\\hermes\\SOUL\.md/);
    assert.match(t5500Dry, /%LOCALAPPDATA%\\hermes\\profiles\\t5500\\SOUL\.md/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
