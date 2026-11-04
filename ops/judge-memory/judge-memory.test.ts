import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  backupStoreToVaultStaging,
  buildSessionStartBrief,
  checkDeniedPath,
  compressToolUseToObservation,
  estimateTokens,
  formatPictureObservation,
  HARD_BRIEF_TOKEN_CEILING,
  JUDGE_SESSION_MARKER_ENV,
  JUDGE_SESSION_MARKER_VALUE,
  JudgeMemoryStore,
  pushDigestAndRulingsToFleetMcp,
  sanitizeJudgeMemoryText,
  stripPrivateTags,
  validateStoreLocation,
  verifyJudgeSessionMarker,
} from './store/index.ts';
import { runSessionStartHook } from './hooks/session-start.mjs';
import { runPostToolUseHook } from './hooks/post-tool-use.mjs';
import { runStopHook } from './hooks/stop.mjs';
import { runSessionEndHook } from './hooks/session-end.mjs';
import { handleMcpJsonRpcRequest } from './server/mcp-server.mjs';

const THIS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(THIS_DIR, '..', '..');

function makeTempTestEnv(extraEnv: Record<string, string> = {}): {
  tmpDir: string;
  dbPath: string;
  obsidianDir: string;
  stagingDir: string;
  env: NodeJS.ProcessEnv;
  cleanup: () => void;
} {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dream-judge-memory-test-'));
  const dbPath = path.join(tmpDir, 'store', 'judge-memory.sqlite');
  const obsidianDir = path.join(tmpDir, 'obsidian', 'Alienware', 'fable');
  const stagingDir = path.join(tmpDir, 'VAULT-STAGING-2026-11-04');

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    [JUDGE_SESSION_MARKER_ENV]: JUDGE_SESSION_MARKER_VALUE,
    JUDGE_MEMORY_DB_PATH: dbPath,
    JUDGE_MEMORY_DIR: path.dirname(dbPath),
    JUDGE_MEMORY_OBSIDIAN_DIR: obsidianDir,
    JUDGE_MEMORY_FLEET_PUSH_ENABLED: 'false',
    COMPUTERNAME: 'Alienware',
  };

  // Clear any wrapper/key env variables that might exist in the test runner environment
  delete env.FREE_CLAUDE_CODE;
  delete env.FCC_SESSION;
  delete env.FCC_PORT;
  delete env.HERMES_SESSION;
  delete env.HERMES_HOME;
  delete env.OPSIS_SESSION;
  delete env.AGY_SESSION;
  delete env.ANTIGRAVITY_AGENT;
  delete env.ANTIGRAVITY_CLI;
  delete env.OMNIROUTE_SESSION;
  delete env.ANTHROPIC_API_KEY;
  delete env.ANTHROPIC_AUTH_TOKEN;
  delete env.ANTHROPIC_BASE_URL;
  delete env.PORT;

  for (const [k, v] of Object.entries(extraEnv)) {
    env[k] = v;
  }

  return {
    tmpDir,
    dbPath,
    obsidianDir,
    stagingDir,
    env,
    cleanup: () => {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // Ignore Windows file lock cleanup race
      }
    },
  };
}

test('Section 1 & 9: Wrapper lockout by session marker writes nothing when marker is absent or wrapper is present', () => {
  const ctx = makeTempTestEnv();
  try {
    // 1. Missing session marker
    const noMarkerEnv = { ...ctx.env };
    delete noMarkerEnv[JUDGE_SESSION_MARKER_ENV];

    const checkMissing = verifyJudgeSessionMarker(noMarkerEnv);
    assert.equal(checkMissing.allowed, false);

    const startRes = runSessionStartHook(
      { session_id: 'unauth-1' },
      { env: noMarkerEnv, dbPath: ctx.dbPath }
    );
    assert.equal(startRes.lockedOut, true);
    assert.equal(fs.existsSync(ctx.dbPath), false, 'Hook without marker must not create SQLite file');

    const postRes = runPostToolUseHook(
      {
        session_id: 'unauth-1',
        tool_name: 'Read',
        tool_input: { file_path: 'docs/standards/AGENT-STANDARD.md' },
      },
      { env: noMarkerEnv, dbPath: ctx.dbPath }
    );
    assert.equal(postRes.lockedOut, true);
    assert.equal(postRes.recorded, false);
    assert.equal(fs.existsSync(ctx.dbPath), false, 'PostToolUse without marker must write nothing');

    const stopRes = runStopHook(
      { session_id: 'unauth-1', last_assistant_message: 'Done reviewing' },
      { env: noMarkerEnv, dbPath: ctx.dbPath }
    );
    assert.equal(stopRes.lockedOut, true);
    assert.equal(fs.existsSync(ctx.dbPath), false);

    const endRes = runSessionEndHook(
      { session_id: 'unauth-1' },
      { env: noMarkerEnv, dbPath: ctx.dbPath, obsidianDir: ctx.obsidianDir }
    );
    assert.equal(endRes.lockedOut, true);
    assert.equal(fs.existsSync(ctx.dbPath), false);
    assert.equal(fs.existsSync(ctx.obsidianDir), false);

    // 2. Wrapper lockout even if DREAM_JUDGE_LANE_SESSION is spoofed
    const wrapperCases: Array<Record<string, string>> = [
      { FREE_CLAUDE_CODE: '1' },
      { FCC_SESSION: 'active' },
      { PORT: '8082' },
      { HERMES_SESSION: 'opsis' },
      { AGY_SESSION: '1' },
      { ANTIGRAVITY_AGENT: 'argon' },
      { OMNIROUTE_SESSION: '1' },
      { ANTHROPIC_API_KEY: ['sk', 'ant', 'FAKEKEY1234567890'].join('-') },
      { ANTHROPIC_BASE_URL: 'http://localhost:8082' },
    ];

    for (const wrapperVars of wrapperCases) {
      const spoofedEnv = { ...ctx.env, ...wrapperVars };
      const check = verifyJudgeSessionMarker(spoofedEnv);
      assert.equal(
        check.allowed,
        false,
        `Expected wrapper lockout for ${Object.keys(wrapperVars).join(',')}`
      );
      const res = runPostToolUseHook(
        {
          session_id: 'spoof-session',
          tool_name: 'Read',
          tool_input: { file_path: 'README.md' },
        },
        { env: spoofedEnv, dbPath: ctx.dbPath }
      );
      assert.equal(res.lockedOut, true);
      assert.equal(fs.existsSync(ctx.dbPath), false);
    }

    // 3. MCP server locked out without session marker
    const mcpLocked = handleMcpJsonRpcRequest(
      { jsonrpc: '2.0', id: 1, method: 'tools/list' },
      { env: noMarkerEnv, dbPath: ctx.dbPath }
    );
    assert.ok(mcpLocked && 'error' in mcpLocked);
    assert.equal(fs.existsSync(ctx.dbPath), false);

    // 4. Store location validation rejects repo paths and OneDrive claude-to-claude drop box
    const inRepoCheck = validateStoreLocation(
      path.join(REPO_ROOT, 'ops', 'judge-memory', 'bad.sqlite'),
      { repoRoot: REPO_ROOT }
    );
    assert.equal(inRepoCheck.valid, false);

    const inDropBoxCheck = validateStoreLocation(
      '%USERPROFILE%/OneDrive/claude-to-claude/judge-memory.sqlite'
    );
    assert.equal(inDropBoxCheck.valid, false);
  } finally {
    ctx.cleanup();
  }
});

test('Section 7 & 9: Deny-list, sanitizeDecisionLogText redaction, <private> tag, vault citation rule, and image rule', () => {
  const ctx = makeTempTestEnv();
  try {
    // 1. Deny-list paths are rejected
    const deniedPaths = [
      '%USERPROFILE%/OneDrive/claude-to-claude/SUP@-VAULT-FOUNDER-ONLY.md',
      '%USERPROFILE%/OneDrive/claude-to-claude/SUP@-VAULT-FOUNDER-ONLY-PHRASES.md',
      '.env',
      '.env.production',
      'config/secrets.env',
      'JOSHUAS.ENV',
      '%USERPROFILE%/OneDrive/claude-to-claude/env-inventory-redacted.json',
      '%USERPROFILE%/OneDrive/claude-to-claude/payments-private-2026-09-17/square.md',
      'ops/payments/transactions.json',
      '%USERPROFILE%/OneDrive/Personal Vault/keys.txt',
      '%USERPROFILE%/Obsidian/Alienware/gemini-to-gemini.md',
      '%USERPROFILE%/Obsidian/Sabretooth/hermes-to-hermes.md',
      '%USERPROFILE%/Obsidian/Alienware/codex-to-codex.md',
      '%USERPROFILE%/Obsidian/Alienware/agy-argon/2026-11-04_note.md',
      '%USERPROFILE%/Obsidian/Sabretooth/opsis/2026-11-04_note.md',
    ];

    for (const dp of deniedPaths) {
      const res = checkDeniedPath(dp);
      assert.equal(res.denied, true, `Expected path to be denied: ${dp}`);

      const hookRes = runPostToolUseHook(
        {
          session_id: 'privacy-session',
          tool_name: 'Read',
          tool_input: { file_path: dp },
          tool_response: 'sensitive content that must never be stored',
        },
        { env: ctx.env, dbPath: ctx.dbPath }
      );
      assert.equal(hookRes.recorded, false, `Hook must not record denied path: ${dp}`);
    }

    // Judge's own Obsidian folder is allowed
    const judgeObsidianCheck = checkDeniedPath(
      '%USERPROFILE%/Obsidian/Alienware/fable/2026-11-04_0300_ALIENWARE_fable.md'
    );
    assert.equal(judgeObsidianCheck.denied, false);

    // 2. Redaction of user paths, private IPs, API keys, and env secrets
    const fakeWinUserPath = ['C:', 'Users', 'sampleuser', 'antigravity', 'DREAM-Engine'].join('\\');
    const fakeLocalAppData = ['C:', 'Users', 'sampleuser', 'AppData', 'Local', 'dream-judge-memory'].join('\\');
    const fakeLanIp = ['192', '168', '1', '40'].join('.');
    const fakeAnthropicKey = ['sk', 'ant', 'api03', 'FAKEKEY1234567890ABCDEF'].join('-');
    const fakeGithubPat = ['ghp', 'FAKETOKEN12345678901234567890ABCD'].join('_');
    const fakeGoogleKey = ['AIza', 'SyFAKEGOOGLEKEY1234567890123456'].join('');
    const fakeSquareToken = ['EAAA', 'FAKESQUARETOKEN1234567890123456789012345678'].join('');
    const fakeVaultCitation =
      '%USERPROFILE%/OneDrive/claude-to-claude/SUP@-VAULT-FOUNDER-ONLY.md';

    const dirtyText = [
      `Checked ${fakeWinUserPath} and ${fakeLocalAppData}`,
      `against node at ${fakeLanIp}`,
      `with keys ${fakeAnthropicKey} ${fakeGithubPat} ${fakeGoogleKey} ${fakeSquareToken}`,
      `and cited ${fakeVaultCitation}`,
      `<private>never store this private judge note</private>`,
    ].join(' ');

    const cleaned = sanitizeJudgeMemoryText(dirtyText, [], ctx.env);
    assert.ok(!cleaned.includes('sampleuser'), 'Windows username must be redacted');
    assert.ok(cleaned.includes('%USERPROFILE%'), 'Must normalize to %USERPROFILE%');
    assert.ok(cleaned.includes('%LOCALAPPDATA%'), 'Must normalize to %LOCALAPPDATA%');
    assert.ok(!cleaned.includes(fakeLanIp), 'Private LAN IP must be redacted');
    assert.ok(!cleaned.includes(fakeAnthropicKey), 'Anthropic key must be redacted');
    assert.ok(!cleaned.includes(fakeGithubPat), 'GitHub token must be redacted');
    assert.ok(!cleaned.includes(fakeGoogleKey), 'Google key must be redacted');
    assert.ok(!cleaned.includes(fakeSquareToken), 'Square token must be redacted');
    assert.ok(!cleaned.includes('never store this private judge note'), '<private> content must be stripped');
    assert.ok(
      cleaned.includes('SUP@-VAULT-FOUNDER-ONLY.md') &&
        !cleaned.includes('claude-to-claude/SUP@-VAULT-FOUNDER-ONLY.md'),
      'Vault citation must be collapsed to bare filename only'
    );

    // 3. Entirely <private> observation is skipped completely
    const whollyPrivate = stripPrivateTags('<private>only secret thoughts here</private>');
    assert.equal(whollyPrivate.hadPrivateTag, true);
    assert.equal(whollyPrivate.emptyAfterStrip, true);

    const privHookRes = runPostToolUseHook(
      {
        session_id: 'privacy-session',
        tool_name: 'Bash',
        tool_input: '<private>internal command</private>',
        tool_response: '<private>internal output</private>',
      },
      { env: ctx.env, dbPath: ctx.dbPath }
    );
    assert.equal(privHookRes.recorded, false);

    // 4. Image look rule records strictly "looked at <file name>, verdict <one line>"
    const picFormatted = formatPictureObservation(
      '%USERPROFILE%/OneDrive/claude-to-claude/images/game-look/hud-reference.png',
      'PASS 4.6/5 layout matches doc 09'
    );
    assert.equal(picFormatted.fileName, 'hud-reference.png');
    assert.equal(
      picFormatted.outcome,
      'looked at hud-reference.png, verdict PASS 4.6/5 layout matches doc 09'
    );

    const imgCompressed = compressToolUseToObservation({
      tool_name: 'Read',
      tool_input: {
        file_path: '%USERPROFILE%/OneDrive/claude-to-claude/images/game-look/side-by-side.png',
      },
      tool_response: 'Verdict: PASS contrast 8.2 to 1',
    });
    assert.equal(imgCompressed.skipped, false);
    assert.equal(imgCompressed.observation?.kind, 'picture_looked_at');
    assert.equal(imgCompressed.observation?.target, 'side-by-side.png');
    assert.equal(
      imgCompressed.observation?.outcome,
      'looked at side-by-side.png, verdict PASS contrast 8.2 to 1'
    );
  } finally {
    ctx.cleanup();
  }
});

test('Section 4 & 5 & 9: SQLite store with 5 tables, FTS5, pruning after digest, VACUUM, and 1,500-token brief ceiling', () => {
  const ctx = makeTempTestEnv();
  const store = new JudgeMemoryStore({ dbPath: ctx.dbPath, env: ctx.env });
  try {
    // 1. Verify all 5 core tables exist
    const tables = store.listTables();
    for (const requiredTable of [
      'sessions',
      'observations',
      'verdicts',
      'rulings',
      'lane_facts',
    ]) {
      assert.ok(
        tables.includes(requiredTable),
        `Missing required SQLite table: ${requiredTable}`
      );
    }

    // 2. Populate >5 rulings, open PR verdicts, prior session NEXT/BLOCKED, and >3 lane_facts
    for (let i = 1; i <= 7; i += 1) {
      store.recordRuling({
        ruled_at: `2026-11-0${Math.min(i, 4)}`,
        ruling: `Ruling number ${i}: keep all engine and recall code 100% in-house with zero keys.`,
        written_in: 'docs/standards/AGENT-STANDARD.md',
      });
    }

    for (let pr = 61; pr <= 68; pr += 1) {
      store.recordVerdict({
        session_id: 'prev-session',
        pr_number: pr,
        repo: 'Trollz1004/dream-online',
        verdict: pr % 2 === 0 ? 'APPROVE' : 'CHANGES REQUESTED',
        reasons: `Reviewed PR #${pr} diff and verified test output and secret scan.`,
        commit_judged: `abc123${pr}`,
        pr_state: 'open',
      });
    }

    store.startSession({ session_id: 'prev-session', node: 'Alienware' });
    store.recordStopSummary({
      session_id: 'prev-session',
      last_reply:
        'Judged PRs #61-#68.\nNEXT: Review recipe 5 judge-memory PR on stack2\nBLOCKED: Waiting on Josh to vault staged env files',
    });

    for (let lf = 1; lf <= 5; lf += 1) {
      store.recordLaneFact({
        session_id: 'prev-session',
        lane: lf % 2 === 0 ? 'gemini-4-argon' : 'claude-sonnet-5-5',
        node: 'Alienware',
        what_it_did: `Built recipe batch ${lf} with full unit test coverage`,
        duration_seconds: 120 * lf,
        what_it_broke: lf === 3 ? 'quota cooldown after 6h' : 'none',
      });
    }

    // 3. Test budget ceiling: requesting 5,000 tokens still clamps to 1,500 ceiling
    const overCeilingBrief = buildSessionStartBrief(store, {
      budgetTokens: 5000,
      currentSessionId: 'new-session',
      env: ctx.env,
    });
    assert.equal(overCeilingBrief.ceilingApplied, true);
    assert.equal(overCeilingBrief.effectiveBudget, HARD_BRIEF_TOKEN_CEILING);
    assert.ok(
      overCeilingBrief.tokenCount <= HARD_BRIEF_TOKEN_CEILING,
      `Brief token count ${overCeilingBrief.tokenCount} exceeded 1500 ceiling`
    );
    assert.ok(overCeilingBrief.brief.includes('## 1. Five newest rulings'));
    assert.ok(overCeilingBrief.brief.includes('## 2. Open PRs with last judge verdict'));
    assert.ok(overCeilingBrief.brief.includes('NEXT: Review recipe 5 judge-memory PR on stack2'));
    assert.ok(overCeilingBrief.brief.includes('BLOCKED: Waiting on Josh to vault staged env files'));
    assert.ok(overCeilingBrief.brief.includes('## 4. Three newest lane facts'));
    assert.ok(overCeilingBrief.brief.includes('Pointers: State page at'));

    // 4. Test custom tighter budget setting (e.g. 140 tokens)
    const tightBrief = buildSessionStartBrief(store, {
      budgetTokens: 140,
      currentSessionId: 'new-session',
      env: ctx.env,
    });
    assert.equal(tightBrief.ceilingApplied, false);
    assert.equal(tightBrief.effectiveBudget, 140);
    assert.ok(
      tightBrief.tokenCount <= 140,
      `Expected tight brief <= 140 tokens, got ${tightBrief.tokenCount}`
    );
    assert.equal(estimateTokens(tightBrief.brief), tightBrief.tokenCount);

    // 5. Test oldest-first pruning only after daily digest exists, plus VACUUM
    for (let i = 1; i <= 6; i += 1) {
      store.recordObservation({
        session_id: 'prev-session',
        kind: 'command_run',
        tool: 'Bash',
        target: `git log -n ${i}`,
        outcome: `checked commit ${i}`,
        created_at: `2026-11-04T01:0${i}:00.000Z`,
      });
    }

    // Without a digest for 2026-11-04, maintenance must NOT prune raw observations
    const beforeDigestMaint = store.runNightlyMaintenance({
      maxObservations: 2,
      vacuum: true,
    });
    assert.equal(beforeDigestMaint.prunedCount, 0);
    assert.equal(beforeDigestMaint.remainingObservations, 6);

    // Create the rules-only 10-line digest for 2026-11-04, then prune down to 2 observations
    const digest = store.createDailyDigest('2026-11-04');
    assert.ok(digest.line_count >= 1 && digest.line_count <= 10);

    const afterDigestMaint = store.runNightlyMaintenance({
      maxObservations: 2,
      vacuum: true,
    });
    assert.equal(afterDigestMaint.prunedCount, 4);
    assert.equal(afterDigestMaint.remainingObservations, 2);
    assert.equal(afterDigestMaint.vacuumed, true);
  } finally {
    store.close();
    ctx.cleanup();
  }
});

test('Section 8: Fleet memory MCP digest push defaults off and backup copies SQLite to Personal Vault staging only', async () => {
  const ctx = makeTempTestEnv();
  const store = new JudgeMemoryStore({ dbPath: ctx.dbPath, env: ctx.env });
  try {
    store.recordRuling({
      ruled_at: '2026-11-04',
      ruling: 'Judge memory raw store stays private on the judge node.',
      written_in: 'DESIGN-JUDGE-MEMORY-2026-11-04.md',
    });
    store.recordObservation({
      session_id: 's1',
      kind: 'file_touched',
      tool: 'Read',
      target: 'docs/standards/AGENT-STANDARD.md',
      outcome: 'read standard',
      created_at: '2026-11-04T02:00:00.000Z',
    });

    // 1. Default off makes zero network calls
    let fetchCalled = false;
    const offResult = await pushDigestAndRulingsToFleetMcp(store, {
      date: '2026-11-04',
      env: { ...ctx.env, JUDGE_MEMORY_FLEET_PUSH_ENABLED: 'false' },
      fetchImpl: async () => {
        fetchCalled = true;
        return new Response('{}', { status: 200 });
      },
    });
    assert.equal(offResult.pushed, false);
    assert.equal(fetchCalled, false);

    // 2. Enabled pushes only digest and rulings to env-named URL, never printing the URL
    const capturedPayloads: Array<Record<string, unknown>> = [];
    const enabledEnv: NodeJS.ProcessEnv = {
      ...ctx.env,
      JUDGE_MEMORY_FLEET_PUSH_ENABLED: 'true',
      AI_MEMORY_MCP_URL: 'https://fleet-memory.example.internal/mcp',
    };
    const onResult = await pushDigestAndRulingsToFleetMcp(store, {
      date: '2026-11-04',
      env: enabledEnv,
      fetchImpl: async (_url, init) => {
        fetchCalled = true;
        capturedPayloads.push(JSON.parse(String(init?.body || '{}')) as Record<string, unknown>);
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      },
    });
    assert.equal(onResult.pushed, true);
    assert.equal(fetchCalled, true);
    assert.ok(!onResult.reason.includes('fleet-memory.example.internal'), 'Must never print env URL value');
    const pushedPayload = capturedPayloads[0] ?? {};
    assert.ok(Array.isArray(pushedPayload.rulings));
    assert.ok(Array.isArray(pushedPayload.digest_lines));
    assert.equal('observations' in pushedPayload, false, 'Raw observations must never be pushed');

    // 3. Backup to Personal Vault staging succeeds and refuses OneDrive drop box
    const backupRes = backupStoreToVaultStaging(store, {
      stagingDir: ctx.stagingDir,
      date: '2026-11-04',
      env: ctx.env,
      repoRoot: REPO_ROOT,
    });
    assert.equal(backupRes.backedUp, true);
    assert.ok(fs.existsSync(backupRes.backupFilePath));
    assert.ok(backupRes.bytesCopied > 0);

    assert.throws(() => {
      backupStoreToVaultStaging(store, {
        stagingDir: '%USERPROFILE%/OneDrive/claude-to-claude/backups',
        date: '2026-11-04',
        env: ctx.env,
      });
    }, /OneDrive|drop box/i);
  } finally {
    store.close();
    ctx.cleanup();
  }
});

test('Section 9: Register and unregister scripts only print planned changes unless run with -Apply', () => {
  const ctx = makeTempTestEnv();
  try {
    const fakeSettingsPath = path.join(ctx.tmpDir, '.claude', 'settings.json');
    const fakeStoreDir = path.join(ctx.tmpDir, 'dream-judge-memory');
    const registerScript = path.join(THIS_DIR, 'scripts', 'register-judge-memory.ps1');
    const unregisterScript = path.join(THIS_DIR, 'scripts', 'unregister-judge-memory.ps1');

    // 1. Dry-run register (no -Apply) prints planned JSON and does not create settings.json
    const dryRegOut = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        registerScript,
        '-SettingsPath',
        fakeSettingsPath,
        '-StoreDir',
        fakeStoreDir,
      ],
      { encoding: 'utf8', windowsHide: true }
    );
    assert.ok(dryRegOut.includes('[DRY RUN]'));
    assert.ok(dryRegOut.includes('dream-judge-memory'));
    assert.equal(
      fs.existsSync(fakeSettingsPath),
      false,
      'register-judge-memory.ps1 without -Apply must not write settings.json'
    );

    // 2. Run with -Apply on temporary settings file (never the real node settings)
    const applyRegOut = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        registerScript,
        '-SettingsPath',
        fakeSettingsPath,
        '-StoreDir',
        fakeStoreDir,
        '-Apply',
      ],
      { encoding: 'utf8', windowsHide: true }
    );
    assert.ok(applyRegOut.includes('[APPLIED]'));
    assert.equal(fs.existsSync(fakeSettingsPath), true);

    const writtenSettings = JSON.parse(fs.readFileSync(fakeSettingsPath, 'utf8'));
    assert.ok(writtenSettings.hooks?.SessionStart);
    assert.ok(writtenSettings.hooks?.PostToolUse);
    assert.ok(writtenSettings.hooks?.Stop);
    assert.ok(writtenSettings.hooks?.SessionEnd);
    assert.ok(writtenSettings.mcpServers?.['dream-judge-memory']);

    // 3. Dry-run unregister (no -Apply) keeps settings.json intact
    const dryUnregOut = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        unregisterScript,
        '-SettingsPath',
        fakeSettingsPath,
      ],
      { encoding: 'utf8', windowsHide: true }
    );
    assert.ok(dryUnregOut.includes('[DRY RUN]'));
    const stillRegistered = JSON.parse(fs.readFileSync(fakeSettingsPath, 'utf8'));
    assert.ok(stillRegistered.mcpServers?.['dream-judge-memory']);

    // 4. Unregister with -Apply removes hooks and MCP entry from temporary settings file
    const applyUnregOut = execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        unregisterScript,
        '-SettingsPath',
        fakeSettingsPath,
        '-Apply',
      ],
      { encoding: 'utf8', windowsHide: true }
    );
    assert.ok(applyUnregOut.includes('[APPLIED]'));
    const afterUnreg = JSON.parse(fs.readFileSync(fakeSettingsPath, 'utf8'));
    assert.equal(afterUnreg.mcpServers?.['dream-judge-memory'], undefined);
  } finally {
    ctx.cleanup();
  }
});

test('Section 2, 6 & 9: Fake session round trip — hooks produce observations, caveman Obsidian note, brief, and MCP search/timeline/get hits', () => {
  const ctx = makeTempTestEnv();
  try {
    const sessionId = 'fake-judge-session-2026-11-04';

    // Seed one founder ruling so the session brief includes rulings too
    const seedStore = new JudgeMemoryStore({ dbPath: ctx.dbPath, env: ctx.env });
    seedStore.recordRuling({
      ruled_at: '2026-11-04',
      ruling: 'Merges go through Josh or the signed-in Claude judge lane; executor lanes open PRs only.',
      written_in: 'docs/standards/AGENT-STANDARD.md',
    });
    seedStore.close();

    // 1. SessionStart hook starts session
    const start1 = runSessionStartHook(
      { session_id: sessionId, node: 'Alienware', started_at: '2026-11-04T03:00:00.000Z' },
      { env: ctx.env, dbPath: ctx.dbPath }
    );
    assert.equal(start1.lockedOut, false);
    assert.ok(start1.brief.includes('Merges go through Josh'));

    // 2. PostToolUse hooks capture rules-only observations across the session
    // 2a. File touched
    const obsFile = runPostToolUseHook(
      {
        session_id: sessionId,
        tool_name: 'Read',
        tool_input: { file_path: 'ops/router/dream-task-router.ts' },
        tool_response: 'Read 1789 lines',
        created_at: '2026-11-04T03:01:00.000Z',
      },
      { env: ctx.env, dbPath: ctx.dbPath }
    );
    assert.equal(obsFile.recorded, true);
    assert.equal(obsFile.observation?.kind, 'file_touched');

    // 2b. Picture looked at
    const obsPic = runPostToolUseHook(
      {
        session_id: sessionId,
        tool_name: 'Read',
        tool_input: {
          file_path: '%USERPROFILE%/OneDrive/claude-to-claude/images/game-look/creator-side-by-side.png',
        },
        tool_response: 'PASS 4.75/5 doc 09 calm dark glass layout',
        created_at: '2026-11-04T03:02:00.000Z',
      },
      { env: ctx.env, dbPath: ctx.dbPath }
    );
    assert.equal(obsPic.recorded, true);
    assert.equal(obsPic.observation?.kind, 'picture_looked_at');
    assert.equal(obsPic.observation?.target, 'creator-side-by-side.png');
    assert.ok(obsPic.observation?.outcome.startsWith('looked at creator-side-by-side.png, verdict '));

    // 2c. Verdict posted on PR #68
    const obsVerdict = runPostToolUseHook(
      {
        session_id: sessionId,
        tool_name: 'Bash',
        tool_input: {
          command:
            'gh pr comment 68 --repo Trollz1004/dream-online --body "Claude judge verdict: APPROVE. Dispatch adapters and 7-day ranking verified."',
          commit_judged: '3b52314',
        },
        tool_response: 'https://github.com/Trollz1004/dream-online/pull/68#issuecomment-1',
        created_at: '2026-11-04T03:03:00.000Z',
      },
      { env: ctx.env, dbPath: ctx.dbPath }
    );
    assert.equal(obsVerdict.recorded, true);
    assert.equal(obsVerdict.observation?.kind, 'verdict_posted');
    assert.equal(obsVerdict.verdict?.pr_number, 68);
    assert.equal(obsVerdict.verdict?.verdict, 'APPROVE');

    // 2d. Lane dispatched
    const obsLane = runPostToolUseHook(
      {
        session_id: sessionId,
        tool_name: 'dispatch_lane',
        tool_input: {
          lane: 'gemini-4-argon',
          node: 'Alienware',
          what_it_did: 'Cooked Volume 2 Recipe 5 judge-memory in clean worktree',
          duration_seconds: 420,
          what_it_broke: 'none',
        },
        tool_response: 'Dispatched gemini-4-argon',
        created_at: '2026-11-04T03:04:00.000Z',
      },
      { env: ctx.env, dbPath: ctx.dbPath }
    );
    assert.equal(obsLane.recorded, true);
    assert.equal(obsLane.observation?.kind, 'lane_dispatched');
    assert.equal(obsLane.laneFact?.lane, 'gemini-4-argon');

    // 3. Stop hook records the judge's final reply and NEXT / BLOCKED lines
    const stopRes = runStopHook(
      {
        session_id: sessionId,
        last_assistant_message:
          'Approved PR #68 after checking test output and secret scan.\nNEXT: Review PR for Volume 2 Recipe 5 judge-memory\nBLOCKED: none',
      },
      { env: ctx.env, dbPath: ctx.dbPath }
    );
    assert.equal(stopRes.recorded, true);
    assert.equal(stopRes.session?.next_step, 'Review PR for Volume 2 Recipe 5 judge-memory');
    assert.equal(stopRes.session?.blocked_by, 'none');

    // 4. SessionEnd hook writes the caveman Obsidian note from the same observations
    const endRes = runSessionEndHook(
      { session_id: sessionId, node: 'Alienware', agent: 'fable' },
      {
        env: ctx.env,
        dbPath: ctx.dbPath,
        obsidianDir: ctx.obsidianDir,
        now: new Date('2026-11-04T08:05:00.000Z'),
      }
    );
    assert.equal(endRes.lockedOut, false);
    assert.ok(endRes.note && fs.existsSync(endRes.note.filePath));
    assert.ok(endRes.note.content.includes('DID:'));
    assert.ok(endRes.note.content.includes('BROKE: none'));
    assert.ok(endRes.note.content.includes('NEXT: Review PR for Volume 2 Recipe 5 judge-memory'));
    assert.ok(endRes.note.content.includes('BLOCKED: none'));
    assert.ok(endRes.note.content.includes('FILES: ops/router/dream-task-router.ts'));

    // 5. Next session's SessionStart hook produces a brief reflecting the fake session's state
    const start2 = runSessionStartHook(
      { session_id: 'next-judge-session', node: 'Alienware' },
      { env: ctx.env, dbPath: ctx.dbPath }
    );
    assert.equal(start2.lockedOut, false);
    assert.ok(start2.tokenCount <= HARD_BRIEF_TOKEN_CEILING);
    assert.ok(start2.brief.includes('Trollz1004/dream-online#68: APPROVE'));
    assert.ok(start2.brief.includes('NEXT: Review PR for Volume 2 Recipe 5 judge-memory'));
    assert.ok(start2.brief.includes('gemini-4-argon on Alienware'));

    // 6. MCP server retrieval: tools/list, search, timeline, and get
    const toolsListResp = handleMcpJsonRpcRequest(
      { jsonrpc: '2.0', id: 10, method: 'tools/list' },
      { env: ctx.env, dbPath: ctx.dbPath }
    ) as unknown as { result: { tools: Array<{ name: string }> } };
    assert.deepEqual(
      toolsListResp.result.tools.map((t) => t.name),
      ['search', 'timeline', 'get']
    );

    const searchResp = handleMcpJsonRpcRequest(
      {
        jsonrpc: '2.0',
        id: 11,
        method: 'tools/call',
        params: { name: 'search', arguments: { query: 'APPROVE 68' } },
      },
      { env: ctx.env, dbPath: ctx.dbPath }
    ) as unknown as { result: { structuredContent: { hits: Array<{ id: string; one_line: string }> } } };
    const hits = searchResp.result.structuredContent.hits;
    assert.ok(hits.length >= 1, 'Expected FTS5 search hit for APPROVE 68');
    assert.ok(hits.some((h) => h.one_line.includes('68') && h.one_line.includes('APPROVE')));

    const timelinePrResp = handleMcpJsonRpcRequest(
      {
        jsonrpc: '2.0',
        id: 12,
        method: 'tools/call',
        params: { name: 'timeline', arguments: { pr: 68 } },
      },
      { env: ctx.env, dbPath: ctx.dbPath }
    ) as unknown as { result: { structuredContent: { entries: Array<{ id: string; one_line: string }> } } };
    assert.ok(timelinePrResp.result.structuredContent.entries.length >= 1);

    const getResp = handleMcpJsonRpcRequest(
      {
        jsonrpc: '2.0',
        id: 13,
        method: 'tools/call',
        params: { name: 'get', arguments: { ids: [hits[0]!.id] } },
      },
      { env: ctx.env, dbPath: ctx.dbPath }
    ) as unknown as { result: { structuredContent: { records: Array<Record<string, unknown>> } } };
    assert.equal(getResp.result.structuredContent.records.length, 1);
    assert.equal(getResp.result.structuredContent.records[0]?.record_id, hits[0]!.id);

    // 7. Also verify stdio MCP server over actual child process stdin/stdout pipes
    const mcpScript = path.join(THIS_DIR, 'server', 'mcp-server.mjs');
    const stdioRun = spawnSync(
      process.execPath,
      [mcpScript],
      {
        env: ctx.env,
        input: `${JSON.stringify({
          jsonrpc: '2.0',
          id: 99,
          method: 'tools/call',
          params: { name: 'search', arguments: { query: 'creator-side-by-side' } },
        })}\n`,
        encoding: 'utf8',
        windowsHide: true,
      }
    );
    assert.equal(stdioRun.status, 0);
    const parsedStdio = JSON.parse(stdioRun.stdout.trim());
    assert.equal(parsedStdio.id, 99);
    assert.ok(
      parsedStdio.result.structuredContent.hits.some((h: { one_line: string }) =>
        h.one_line.includes('looked at creator-side-by-side.png')
      )
    );
  } finally {
    ctx.cleanup();
  }
});
