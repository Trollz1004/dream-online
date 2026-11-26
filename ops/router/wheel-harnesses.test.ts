import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildCodexCliCommand,
  buildGeminiCliCommand,
  CodexCliDispatchAdapter,
  type CommandExecRequest,
  type CommandExecResult,
  detectQuotaOr429Error,
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  findExecutableOnPath,
  GeminiCliDispatchAdapter,
  JevRouter,
  loadLaneTable,
  parsePrUrlFromOutput,
  profileTask,
  resolveLaneHarness,
  validateLaneTable,
} from './dream-task-router.ts';
import {
  createMockInboxCommandRunner,
  DEFAULT_INBOX_WORKERS,
  ensureInboxFolders,
  InboxRunner,
  LANES_NOW_FILE_NAME,
} from './inbox-runner.ts';

test('codex-cli and gemini-cli adapters: find executable on PATH, build headless commands, write attempt log/result, scrub keys/tokens, and report quota or sign-in failure in agy shape', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-wheel-cli-adapters-'));
  try {
    const binDir = path.join(tmpRoot, 'bin');
    const kitchenDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen');
    const worktreeDir = path.join(tmpRoot, 'worktree');
    fs.mkdirSync(binDir, { recursive: true });
    fs.mkdirSync(worktreeDir, { recursive: true });

    const ext = process.platform === 'win32' ? '.cmd' : '';
    const fakeCodexBin = path.join(binDir, `codex${ext}`);
    const fakeGeminiBin = path.join(binDir, `gemini${ext}`);
    fs.writeFileSync(fakeCodexBin, 'echo codex\n', { encoding: 'utf8', mode: 0o755 });
    fs.writeFileSync(fakeGeminiBin, 'echo gemini\n', { encoding: 'utf8', mode: 0o755 });

    const testEnv: NodeJS.ProcessEnv = {
      PATH: binDir,
      USERPROFILE: tmpRoot,
      GH_TOKEN: 'should-be-scrubbed-gh',
      GITHUB_TOKEN: 'should-be-scrubbed-github',
      OPENAI_API_KEY: 'should-be-scrubbed-openai',
      GEMINI_API_KEY: 'should-be-scrubbed-gemini',
      GOOGLE_API_KEY: 'should-be-scrubbed-google',
      ANTHROPIC_API_KEY: 'should-be-scrubbed-anthropic',
    };

    assert.equal(findExecutableOnPath('codex', testEnv), fakeCodexBin);
    assert.equal(findExecutableOnPath('gemini', testEnv), fakeGeminiBin);

    // 1. Codex CLI command builder & dispatch
    const builtCodex = buildCodexCliCommand({
      prompt: 'Fix "double quoted" race condition in src/queue.ts',
      env: testEnv,
    });
    assert.equal(builtCodex.command, fakeCodexBin);
    assert.equal(builtCodex.args[0], 'exec');
    assert.ok(builtCodex.args.includes('--dangerously-bypass-approvals-and-sandbox'));
    assert.ok(!builtCodex.sanitizedPrompt.includes('"'));
    assert.ok(builtCodex.sanitizedPrompt.includes("'double quoted'"));
    assert.equal(builtCodex.args[builtCodex.args.length - 1], builtCodex.sanitizedPrompt);

    const codexCalls: CommandExecRequest[] = [];
    const codexAdapter = new CodexCliDispatchAdapter({
      kitchenDir,
      runner: async (req): Promise<CommandExecResult> => {
        codexCalls.push(req);
        return {
          exitCode: 0,
          stdout: 'ℹ tests 12\nℹ pass 12\nOpened https://github.com/Trollz1004/dream-online/pull/601',
          stderr: '',
        };
      },
      now: () => new Date('2026-11-25T18:00:00Z'),
    });

    const codexHandle = await codexAdapter.dispatch({
      jobId: 'codex-job-1',
      prompt: 'Fix "double quoted" race condition in src/queue.ts',
      jobClass: 'code-hard',
      lane: 'codex',
      harness: 'codex-cli',
      cwd: worktreeDir,
      env: testEnv,
    });
    assert.equal(codexHandle.adapter, 'codex-cli');
    assert.equal(codexHandle.harness, 'codex-cli');
    assert.equal(codexCalls.length, 1);
    assert.equal(codexCalls[0].command, fakeCodexBin);
    assert.equal(codexCalls[0].cwd, worktreeDir);
    assert.equal(codexCalls[0].env?.GH_TOKEN, undefined);
    assert.equal(codexCalls[0].env?.OPENAI_API_KEY, undefined);
    assert.equal(codexCalls[0].env?.ANTHROPIC_API_KEY, undefined);
    assert.equal(
      codexCalls[0].env?.GH_CONFIG_DIR,
      path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'gh-runner')
    );

    const codexPoll = await codexHandle.poll();
    assert.equal(codexPoll.done, true);
    assert.equal(codexPoll.exitCode, 0);
    assert.equal(codexPoll.prUrl, 'https://github.com/Trollz1004/dream-online/pull/601');
    assert.ok(fs.existsSync(codexHandle.promptPath));
    assert.ok(fs.existsSync(codexHandle.logPath!));

    // 2. Gemini CLI command builder & dispatch
    const builtGemini = buildGeminiCliCommand({
      prompt: 'Rename "oldHelper" in src/utils.ts',
      env: testEnv,
    });
    assert.equal(builtGemini.command, fakeGeminiBin);
    assert.ok(builtGemini.args.includes('-y'));
    assert.ok(builtGemini.args.includes('--output-format'));
    assert.ok(builtGemini.args.includes('text'));
    assert.ok(builtGemini.args.includes('-p'));
    assert.equal(builtGemini.args[builtGemini.args.indexOf('-p') + 1], builtGemini.sanitizedPrompt);

    const geminiCalls: CommandExecRequest[] = [];
    const geminiAdapter = new GeminiCliDispatchAdapter({
      kitchenDir,
      runner: async (req): Promise<CommandExecResult> => {
        geminiCalls.push(req);
        return {
          exitCode: 0,
          stdout: 'ℹ tests 8\nℹ pass 8\nOpened https://github.com/Trollz1004/dream-online/pull/602',
          stderr: '',
        };
      },
      now: () => new Date('2026-11-25T18:05:00Z'),
    });

    const geminiHandle = await geminiAdapter.dispatch({
      jobId: 'gemini-job-1',
      prompt: 'Rename "oldHelper" in src/utils.ts',
      jobClass: 'mechanical',
      lane: 'gemini-cli',
      harness: 'gemini-cli',
      cwd: worktreeDir,
      env: testEnv,
    });
    assert.equal(geminiHandle.adapter, 'gemini-cli');
    assert.equal(geminiHandle.harness, 'gemini-cli');
    assert.equal(geminiCalls.length, 1);
    assert.equal(geminiCalls[0].command, fakeGeminiBin);
    assert.equal(geminiCalls[0].cwd, worktreeDir);
    assert.equal(geminiCalls[0].env?.GH_TOKEN, undefined);
    assert.equal(geminiCalls[0].env?.GEMINI_API_KEY, undefined);
    assert.equal(geminiCalls[0].env?.GOOGLE_API_KEY, undefined);

    const geminiPoll = await geminiHandle.poll();
    assert.equal(geminiPoll.done, true);
    assert.equal(geminiPoll.exitCode, 0);
    assert.equal(geminiPoll.prUrl, 'https://github.com/Trollz1004/dream-online/pull/602');

    // 3. Sign-in and quota failures report in the same shape as agy so detectQuotaOr429Error walks the ladder
    const signInFailCodex = new CodexCliDispatchAdapter({
      kitchenDir,
      runner: async () => ({
        exitCode: 1,
        stdout: '',
        stderr: 'Error: Not logged in. Please run codex login first.',
      }),
    });
    const signInHandle = await signInFailCodex.dispatch({
      jobId: 'codex-signin-fail',
      prompt: 'Review PR',
      jobClass: 'review',
      lane: 'codex',
      harness: 'codex-cli',
      cwd: worktreeDir,
      env: testEnv,
    });
    const signInRes = await signInHandle.poll();
    const signInQuotaCheck = detectQuotaOr429Error(
      signInRes.output,
      signInRes.error,
      signInRes.exitCode
    );
    assert.equal(signInQuotaCheck.isQuotaError, true);

    const quotaFailGemini = new GeminiCliDispatchAdapter({
      kitchenDir,
      runner: async () => ({
        exitCode: 1,
        stdout: '',
        stderr: 'Error: You have hit your usage limit. Try again in 2h.',
      }),
    });
    const quotaHandle = await quotaFailGemini.dispatch({
      jobId: 'gemini-quota-fail',
      prompt: 'Fix typo',
      jobClass: 'mechanical',
      lane: 'gemini-cli',
      harness: 'gemini-cli',
      cwd: worktreeDir,
      env: testEnv,
    });
    const quotaRes = await quotaHandle.poll();
    const geminiQuotaCheck = detectQuotaOr429Error(
      quotaRes.output,
      quotaRes.error,
      quotaRes.exitCode
    );
    assert.equal(geminiQuotaCheck.isQuotaError, true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('lanes.json: adds codex and gemini-cli with separate quota groups, updated ladders, and review job class (codex -> gemini-cli)', () => {
  const table = loadLaneTable();
  const validation = validateLaneTable(table);
  assert.equal(validation.valid, true, validation.errors.join('; '));

  // Separate quota groups and harnesses
  assert.equal(resolveLaneHarness(table, 'codex'), 'codex-cli');
  assert.equal(resolveLaneHarness(table, 'gemini-cli'), 'gemini-cli');
  assert.ok(table.quotaGroups['codex-cli']);
  assert.ok(table.quotaGroups['gemini-cli']);
  assert.deepEqual(table.quotaGroups['codex-cli'].lanes, ['codex']);
  assert.deepEqual(table.quotaGroups['gemini-cli'].lanes, ['gemini-cli']);

  // gemini-cli on mechanical and route right after gemini-3.8-flash
  const routeLadder = table.lanes.route.ladder;
  assert.equal(routeLadder[routeLadder.indexOf('gemini-3.8-flash') + 1], 'gemini-cli');
  const mechLadder = table.lanes.mechanical.ladder;
  assert.equal(mechLadder[mechLadder.indexOf('gemini-3.8-flash') + 1], 'gemini-cli');

  // gemini-cli on code-bulk after gemini-4-argon, and codex after the Gemini 4 rungs and before last-resort
  const bulkLadder = table.lanes['code-bulk'].ladder;
  const bulkArgonIdx = bulkLadder.indexOf('gemini-4-argon');
  const bulkGeminiCliIdx = bulkLadder.indexOf('gemini-cli');
  const bulkCodexIdx = bulkLadder.indexOf('codex');
  const bulkLastResortIdx = bulkLadder.indexOf('last-resort');
  assert.equal(bulkGeminiCliIdx, bulkArgonIdx + 1);
  assert.ok(bulkCodexIdx > bulkArgonIdx && bulkCodexIdx > bulkGeminiCliIdx);
  assert.ok(bulkCodexIdx < bulkLastResortIdx);

  // codex on code-hard after the Gemini 4 rungs and before last-resort
  const hardLadder = table.lanes['code-hard'].ladder;
  const hardArgonIdx = hardLadder.indexOf('gemini-4-argon');
  const hardCodexIdx = hardLadder.indexOf('codex');
  const hardLastResortIdx = hardLadder.indexOf('last-resort');
  assert.ok(hardCodexIdx > hardArgonIdx);
  assert.ok(hardCodexIdx < hardLastResortIdx);

  // review job class: ladder is codex, then gemini-cli
  const reviewRow = table.lanes.review;
  assert.ok(reviewRow, 'lanes.json must define review job class');
  assert.equal(reviewRow.lane, 'codex');
  assert.equal(reviewRow.harness, 'codex-cli');
  assert.deepEqual(reviewRow.ladder, ['codex', 'gemini-cli']);
  assert.equal(reviewRow.fallback, 'gemini-cli');

  // Quota separation: marking agy-gemini cold does NOT mark gemini-cli cold
  const now = new Date('2026-11-25T18:10:00Z');
  const router = new JevRouter({
    decisionsLogPath: path.join(os.tmpdir(), `jev-quota-sep-${Date.now()}.log`),
  });
  router.reportQuotaError('gemini-3.8-flash', 'HTTP 429 quota exceeded', now);
  router.reportQuotaError('gemini-4-argon', 'HTTP 429 quota exceeded', now);
  assert.equal(router.isLaneCold('gemini-3.8-flash', now), true);
  assert.equal(router.isLaneCold('gemini-4-argon', now), true);
  assert.equal(router.isLaneCold('gemini-cli', now), false, 'gemini-cli quota is separate from agy');
  assert.equal(router.isLaneCold('codex', now), false, 'codex quota is separate from agy');

  // With gemini-3.8-flash cold, mechanical walks right to gemini-cli
  const mechDecision = router.route('Fix typo in README.md', { now, lane: 'mechanical' });
  assert.equal(mechDecision.lane, 'gemini-cli');
  assert.equal(mechDecision.harness, 'gemini-cli');

  // Review ticket profiles as review and walks from codex to gemini-cli when codex is cold
  const revProfile = profileTask(
    'Only reads pull request #155 and leaves one comment; never pushes, merges or approves.',
    { lane: 'review' }
  );
  assert.equal(revProfile.jobClass, 'review');
  const revDecision1 = router.route('Read PR #155 and leave one comment', { now, lane: 'review' });
  assert.equal(revDecision1.job_class, 'review');
  assert.equal(revDecision1.lane, 'codex');
  assert.equal(revDecision1.harness, 'codex-cli');

  router.reportQuotaError('codex', 'Not logged in', now);
  const revDecision2 = router.route('Read PR #155 and leave one comment', { now, lane: 'review' });
  assert.equal(revDecision2.job_class, 'review');
  assert.equal(revDecision2.lane, 'gemini-cli');
  assert.equal(revDecision2.harness, 'gemini-cli');
});

test('multi-harness workers & lanes-now.json: two tickets for two repos on two harnesses run together while two tickets for one repo do not', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-wheel-concurrency-'));
  try {
    const kitchenDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen');
    const inboxDir = path.join(kitchenDir, 'inbox');
    const worktreeParentDir = path.join(tmpRoot, 'antigravity');
    const agRoot = path.join(tmpRoot, 'antigravity', 'ANTIGRAVITY-sibling');
    fs.mkdirSync(agRoot, { recursive: true });
    const folders = ensureInboxFolders(inboxDir);

    // Ticket 1: dream-online on harness agy (lane: engine -> gemini-4-argon)
    const t1 = path.join(folders.queued, '01-dream-engine.md');
    fs.writeFileSync(
      t1,
      ['# Optimize water shader', 'repo: dream-online', 'lane: engine', '', 'Tune src/shaders/water.wgsl.'].join('\n'),
      'utf8'
    );
    fs.utimesSync(t1, new Date('2026-11-25T18:01:00Z'), new Date('2026-11-25T18:01:00Z'));

    // Ticket 2: ANTIGRAVITY on harness codex-cli (lane: review -> codex)
    const t2 = path.join(folders.queued, '02-ag-review.md');
    fs.writeFileSync(
      t2,
      [
        '# Review ANTIGRAVITY PR 99',
        'repo: ANTIGRAVITY',
        'lane: review',
        '',
        'Read https://github.com/Trollz1004/ANTIGRAVITY/pull/99 and leave one comment.',
      ].join('\n'),
      'utf8'
    );
    fs.utimesSync(t2, new Date('2026-11-25T18:02:00Z'), new Date('2026-11-25T18:02:00Z'));

    let activeDispatches = 0;
    let peakConcurrent = 0;
    const lanesNowSnapshotsDuringRun: Array<Record<string, unknown>> = [];
    const lanesNowFile = path.join(kitchenDir, LANES_NOW_FILE_NAME);

    const makeHarnessAdapter = (
      adapterName: 'agy' | 'codex-cli' | 'gemini-cli',
      prUrl: string
    ): DispatchAdapter => ({
      name: adapterName,
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        activeDispatches += 1;
        peakConcurrent = Math.max(peakConcurrent, activeDispatches);
        if (fs.existsSync(lanesNowFile)) {
          lanesNowSnapshotsDuringRun.push(JSON.parse(fs.readFileSync(lanesNowFile, 'utf8')));
        }
        return {
          jobId: input.jobId ?? `${adapterName}-job`,
          adapter: adapterName,
          lane: input.lane,
          harness: adapterName,
          promptPath: path.join(tmpRoot, `${input.jobId ?? adapterName}.txt`),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: `mock ${adapterName}`,
          poll: async () => {
            await new Promise((resolve) => setTimeout(resolve, 60));
            if (fs.existsSync(lanesNowFile)) {
              lanesNowSnapshotsDuringRun.push(JSON.parse(fs.readFileSync(lanesNowFile, 'utf8')));
            }
            activeDispatches -= 1;
            const output = `ℹ tests 5\nℹ pass 5\nCompleted ${prUrl}`;
            return {
              done: true,
              prUrl: parsePrUrlFromOutput(output),
              output,
              exitCode: 0,
            };
          },
        };
      },
    });

    const { runner: cmdRunner } = createMockInboxCommandRunner({ ghSignedIn: true });
    const runner = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapters: {
        agy: makeHarnessAdapter('agy', 'https://github.com/Trollz1004/dream-online/pull/701'),
        'codex-cli': makeHarnessAdapter('codex-cli', 'https://github.com/Trollz1004/ANTIGRAVITY/pull/99'),
        'gemini-cli': makeHarnessAdapter('gemini-cli', 'https://github.com/Trollz1004/dream-online/pull/702'),
      },
      commandRunner: cmdRunner,
      env: { USERPROFILE: tmpRoot, ANTIGRAVITY_REPO_ROOT: agRoot },
      now: () => new Date('2026-11-25T18:20:00Z'),
    });

    assert.equal(DEFAULT_INBOX_WORKERS, 2);
    assert.equal(runner.getMaxWorkers(), 2);

    // 1. Two tickets for two repos on two harnesses run together
    const [res1, res2] = await Promise.all([runner.tick(), runner.tick()]);
    assert.equal(res1.status, 'done', res1.reason);
    assert.equal(res2.status, 'done', res2.reason);
    assert.equal(peakConcurrent, 2, 'Two tickets on different repos and different harnesses must run together');

    // Verify lanes-now.json captured both harnesses running and their lastResult after completion
    assert.ok(fs.existsSync(lanesNowFile), 'lanes-now.json must be written in the kitchen folder');
    const overlapSnapshot = lanesNowSnapshotsDuringRun.find((snap) => {
      const harnesses = (snap.harnesses ?? snap) as Record<string, { status?: string }>;
      return harnesses.agy?.status === 'running' && harnesses['codex-cli']?.status === 'running';
    });
    assert.ok(overlapSnapshot, 'lanes-now.json must show both agy and codex-cli running together');

    const finalLanesNow = JSON.parse(fs.readFileSync(lanesNowFile, 'utf8'));
    assert.equal(finalLanesNow.harnesses.agy.status, 'idle');
    assert.equal(finalLanesNow.harnesses.agy.lastResult.taskId, '01-dream-engine');
    assert.equal(finalLanesNow.harnesses.agy.lastResult.status, 'done');
    assert.equal(finalLanesNow.harnesses['codex-cli'].status, 'idle');
    assert.equal(finalLanesNow.harnesses['codex-cli'].lastResult.taskId, '02-ag-review');
    assert.equal(finalLanesNow.harnesses['codex-cli'].lastResult.status, 'done');

    // 2. Two tickets for ONE repo on two different harnesses do NOT run together
    peakConcurrent = 0;
    const sameRepo1 = path.join(folders.queued, '03-same-repo-a.md');
    const sameRepo2 = path.join(folders.queued, '04-same-repo-b.md');
    fs.writeFileSync(
      sameRepo1,
      ['# Engine task on dream-online', 'repo: dream-online', 'lane: engine', '', 'Tune src/shaders/a.wgsl.'].join('\n'),
      'utf8'
    );
    fs.utimesSync(sameRepo1, new Date('2026-11-25T18:03:00Z'), new Date('2026-11-25T18:03:00Z'));
    fs.writeFileSync(
      sameRepo2,
      [
        '# Review task on dream-online',
        'repo: dream-online',
        'lane: review',
        '',
        'Read https://github.com/Trollz1004/dream-online/pull/701 and leave one comment.',
      ].join('\n'),
      'utf8'
    );
    fs.utimesSync(sameRepo2, new Date('2026-11-25T18:04:00Z'), new Date('2026-11-25T18:04:00Z'));

    const [sameRes1, sameRes2] = await Promise.all([runner.tick(), runner.tick()]);
    const statuses = [sameRes1.status, sameRes2.status].sort();
    assert.deepEqual(statuses, ['busy', 'done'], 'Second ticket on the same repo must return busy while first runs');
    assert.equal(peakConcurrent, 1, 'Never two tickets on the same repo at once');

    // Finish the remaining queued ticket on the next tick
    const finishRemaining = await runner.tick();
    assert.equal(finishRemaining.status, 'done');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
