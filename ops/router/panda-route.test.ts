import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_QUOTA_COOLDOWN_HOURS,
  DEFAULT_QUOTA_COOLDOWN_MS,
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  JevRouter,
  MAX_QUOTA_COOLDOWN_MS,
  MIN_QUOTA_COOLDOWN_MS,
  parsePrUrlFromOutput,
  parseQuotaCooldown,
  QUOTA_RESET_BUFFER_MS,
} from './dream-task-router.ts';
import {
  askPandaRoute,
  createMockInboxCommandRunner,
  DEFAULT_PANDA_MIN_SUCCESS,
  DEFAULT_PANDA_MODE,
  DEFAULT_PANDA_POOL,
  DEFAULT_PANDA_ROUTE_URL,
  DEFAULT_PANDA_TIMEOUT_MS,
  ensureInboxFolders,
  formatTaskLogFirstLine,
  InboxRunner,
} from './inbox-runner.ts';

const MOCK_PR_URL = 'https://github.com/Trollz1004/dream-online/pull/401';

function createFakeAdapter(
  tmpRoot: string,
  seen: DispatchJobInput[],
  output: string = `Opened pull request ${MOCK_PR_URL}`
): DispatchAdapter {
  return {
    name: 'agy',
    async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
      seen.push(input);
      return {
        jobId: input.jobId ?? 'mock-job',
        adapter: 'agy',
        lane: input.lane,
        harness: 'agy',
        promptPath: path.join(tmpRoot, 'prompt.txt'),
        sanitizedPrompt: input.prompt,
        mode: 'headless-cli',
        httpSessionSupported: false,
        note: 'mock lane run without agy',
        poll: async () => ({
          done: true,
          prUrl: parsePrUrlFromOutput(output),
          output,
          exitCode: 0,
        }),
      };
    },
  };
}

test('askPandaRoute: POSTs task text to /route with pool, mode cheapest_above_threshold, min success 0.6, 2s limit, and maps card to agy model', async () => {
  let seenUrl = '';
  let seenInit: RequestInit | undefined;

  const fakeFetch: typeof fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seenUrl = String(input);
    seenInit = init;
    return new Response(
      JSON.stringify({
        choice: {
          model_id: 'openrouter-gemini-3.8-flash',
          confidence: 0.67,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }) as typeof fetch;

  assert.equal(DEFAULT_PANDA_TIMEOUT_MS, 2_000);
  assert.equal(DEFAULT_PANDA_ROUTE_URL, 'http://192.168.0.40:8765/route');
  const picked = await askPandaRoute('Fix typo in README header', {
    pool: { ...DEFAULT_PANDA_POOL },
    fetchImpl: fakeFetch,
  });

  assert.equal(picked, 'gemini-3.8-flash');
  assert.equal(seenUrl, DEFAULT_PANDA_ROUTE_URL);
  assert.equal(seenInit?.method, 'POST');

  const parsedBody = JSON.parse(String(seenInit?.body));
  assert.equal(parsedBody.task.text, 'Fix typo in README header');
  assert.deepEqual(parsedBody.pool, Object.values(DEFAULT_PANDA_POOL));
  assert.equal(parsedBody.mode, DEFAULT_PANDA_MODE);
  assert.equal(parsedBody.min_p_success, DEFAULT_PANDA_MIN_SUCCESS);
  assert.equal(parsedBody.preferences.mode, DEFAULT_PANDA_MODE);
  assert.equal(parsedBody.preferences.min_p_success, DEFAULT_PANDA_MIN_SUCCESS);
});

test('askPandaRoute: returns null when Panda is down, slow, returns malformed JSON or missing model_id, or answers a model not in the pool', async () => {
  // 1. Down (connection error)
  const downPick = await askPandaRoute('Fix typo', {
    pool: { ...DEFAULT_PANDA_POOL },
    fetchImpl: (async () => {
      throw new Error('connect ECONNREFUSED 192.168.0.40:8765');
    }) as unknown as typeof fetch,
  });
  assert.equal(downPick, null);

  // 2. Slow (exceeds timeoutMs)
  const slowPick = await askPandaRoute('Fix typo', {
    pool: { ...DEFAULT_PANDA_POOL },
    timeoutMs: 30,
    fetchImpl: (async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return new Response(JSON.stringify({ choice: { model_id: 'claude-sonnet-5.5' } }), {
        status: 200,
      });
    }) as typeof fetch,
  });
  assert.equal(slowPick, null);

  // 3. Model not in pool
  const outOfPoolPick = await askPandaRoute('Fix typo', {
    pool: { ...DEFAULT_PANDA_POOL },
    fetchImpl: (async () =>
      new Response(JSON.stringify({ choice: { model_id: 'openrouter-gpt-6.1-sol' } }), {
        status: 200,
      })) as typeof fetch,
  });
  assert.equal(outOfPoolPick, null);

  // 4. Malformed JSON
  const malformedJsonPick = await askPandaRoute('Fix typo', {
    pool: { ...DEFAULT_PANDA_POOL },
    fetchImpl: (async () =>
      new Response('{not-valid-json', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch,
  });
  assert.equal(malformedJsonPick, null);

  // 5. Missing model_id
  const missingModelIdPick = await askPandaRoute('Fix typo', {
    pool: { ...DEFAULT_PANDA_POOL },
    fetchImpl: (async () =>
      new Response(JSON.stringify({ choice: {} }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch,
  });
  assert.equal(missingModelIdPick, null);
});

test('runner + Panda: uses Panda pick when no model header or engine floor interferes, and logs panda on line 1', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-panda-pick-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'panda-pick.md'),
      ['# Tidy README links', '', 'Fix broken documentation links in README.md.'].join('\n'),
      'utf8'
    );

    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: createFakeAdapter(tmpRoot, seen),
      commandRunner: runner,
      pandaPool: { ...DEFAULT_PANDA_POOL },
      pandaFetch: (async () =>
        new Response(JSON.stringify({ choice: { model_id: 'claude-sonnet-5.5' } }), {
          status: 200,
        })) as typeof fetch,
    });

    const tick = await inboxRunner.tick();
    assert.equal(tick.status, 'done');
    assert.equal(tick.lane, 'claude-sonnet-5-5');
    assert.equal(tick.modelPickedBy, 'panda');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].lane, 'claude-sonnet-5-5');

    const logLines = fs
      .readFileSync(path.join(folders.done, 'panda-pick.log'), 'utf8')
      .split(/\r?\n/);
    assert.ok(
      logLines[0].startsWith(`${formatTaskLogFirstLine('claude-sonnet-5-5', 'panda')} | code map: `),
      logLines[0]
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('header override: task header model line wins over a model named on the lane line, does not call Panda at all, and logs header on first line of task log', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-panda-header-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const t1 = path.join(folders.queued, '01-header-override.md');
    const t2 = path.join(folders.queued, '02-model-wins-over-lane-model.md');
    fs.writeFileSync(
      t1,
      [
        '# Add unit test for helper',
        'model: gemini-3.8-flash',
        '',
        'Add a unit test in src/utils/math.test.ts.',
      ].join('\n'),
      'utf8'
    );
    fs.utimesSync(t1, new Date('2026-11-14T01:00:00Z'), new Date('2026-11-14T01:00:00Z'));

    fs.writeFileSync(
      t2,
      [
        '# Add unit test for parser',
        'lane: claude-sonnet-5-5',
        'model: gemini-3.8-flash',
        '',
        'Add a unit test in src/utils/parser.test.ts.',
      ].join('\n'),
      'utf8'
    );
    fs.utimesSync(t2, new Date('2026-11-14T02:00:00Z'), new Date('2026-11-14T02:00:00Z'));

    let pandaCalls = 0;
    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: createFakeAdapter(tmpRoot, seen),
      commandRunner: runner,
      pandaPool: { ...DEFAULT_PANDA_POOL },
      pandaFetch: (async () => {
        pandaCalls += 1;
        return new Response(JSON.stringify({ choice: { model_id: 'claude-opus-5.5' } }), {
          status: 200,
        });
      }) as typeof fetch,
    });

    const tick1 = await inboxRunner.tick();
    assert.equal(tick1.status, 'done');
    assert.equal(tick1.lane, 'gemini-3.8-flash');
    assert.equal(tick1.modelPickedBy, 'header');
    assert.equal(pandaCalls, 0, 'Panda must not be called when a model header decides the model');
    assert.equal(seen[0].lane, 'gemini-3.8-flash');

    const log1Lines = fs
      .readFileSync(path.join(folders.done, '01-header-override.log'), 'utf8')
      .split(/\r?\n/);
    assert.ok(log1Lines[0].startsWith('model: gemini-3.8-flash (picked by: header) | code map: '), log1Lines[0]);

    const tick2 = await inboxRunner.tick();
    assert.equal(tick2.status, 'done');
    assert.equal(tick2.lane, 'gemini-3.8-flash', 'model: header must win over model named on lane: line');
    assert.equal(tick2.modelPickedBy, 'header');
    assert.equal(pandaCalls, 0, 'Panda must not be called when model: header wins over lane: model');
    assert.equal(seen[1].lane, 'gemini-3.8-flash');

    const log2Lines = fs
      .readFileSync(path.join(folders.done, '02-model-wins-over-lane-model.log'), 'utf8')
      .split(/\r?\n/);
    assert.ok(log2Lines[0].startsWith('model: gemini-3.8-flash (picked by: header) | code map: '), log2Lines[0]);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('engine floor: lane engine never runs below claude-opus-5-5 or gemini-4-argon (including with a lower model header) and logs floor on first line of task log', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-panda-floor-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);

    const t1 = path.join(folders.queued, '01-engine-floor-flash.md');
    const t2 = path.join(folders.queued, '02-engine-floor-opus.md');
    const t3 = path.join(folders.queued, '03-engine-floor-lower-header.md');
    fs.writeFileSync(
      t1,
      ['# Optimize WebGPU shadow pass', 'lane: engine', '', 'Tune src/shaders/shadow.wgsl.'].join(
        '\n'
      ),
      'utf8'
    );
    fs.utimesSync(t1, new Date('2026-11-14T01:00:00Z'), new Date('2026-11-14T01:00:00Z'));

    fs.writeFileSync(
      t2,
      ['# Optimize WebGPU water pass', 'lane: engine', '', 'Tune src/shaders/water.wgsl.'].join(
        '\n'
      ),
      'utf8'
    );
    fs.utimesSync(t2, new Date('2026-11-14T02:00:00Z'), new Date('2026-11-14T02:00:00Z'));

    fs.writeFileSync(
      t3,
      [
        '# Optimize WebGPU terrain pass',
        'lane: engine',
        'model: gemini-3.8-flash',
        '',
        'Tune src/shaders/terrain.wgsl.',
      ].join('\n'),
      'utf8'
    );
    fs.utimesSync(t3, new Date('2026-11-14T03:00:00Z'), new Date('2026-11-14T03:00:00Z'));

    let callIndex = 0;
    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: createFakeAdapter(tmpRoot, seen),
      commandRunner: runner,
      pandaPool: { ...DEFAULT_PANDA_POOL },
      pandaFetch: (async () => {
        callIndex += 1;
        // First call returns gemini-3.8-flash (below floor); second call returns claude-opus-5.5 (meets floor)
        const card = callIndex === 1 ? 'openrouter-gemini-3.8-flash' : 'claude-opus-5.5';
        return new Response(JSON.stringify({ choice: { model_id: card } }), { status: 200 });
      }) as typeof fetch,
    });

    // Tick 1: Panda answered gemini-3.8-flash -> clamped to gemini-4-argon by floor
    const tick1 = await inboxRunner.tick();
    assert.equal(tick1.status, 'done');
    assert.equal(tick1.jobClass, 'engine');
    assert.equal(tick1.lane, 'gemini-4-argon');
    assert.equal(tick1.modelPickedBy, 'floor');
    assert.equal(seen[0].lane, 'gemini-4-argon');

    const log1Lines = fs
      .readFileSync(path.join(folders.done, '01-engine-floor-flash.log'), 'utf8')
      .split(/\r?\n/);
    assert.ok(log1Lines[0].startsWith('model: gemini-4-argon (picked by: floor) | code map: '), log1Lines[0]);

    // Tick 2: Panda answered claude-opus-5.5 -> meets floor so Panda answer is used
    const tick2 = await inboxRunner.tick();
    assert.equal(tick2.status, 'done');
    assert.equal(tick2.jobClass, 'engine');
    assert.equal(tick2.lane, 'claude-opus-5-5');
    assert.equal(tick2.modelPickedBy, 'panda');
    assert.equal(seen[1].lane, 'claude-opus-5-5');

    const log2Lines = fs
      .readFileSync(path.join(folders.done, '02-engine-floor-opus.log'), 'utf8')
      .split(/\r?\n/);
    assert.ok(log2Lines[0].startsWith('model: claude-opus-5-5 (picked by: panda) | code map: '), log2Lines[0]);

    // Tick 3: task has lane: engine + model: gemini-3.8-flash -> clamped to gemini-4-argon by floor without calling Panda
    const tick3 = await inboxRunner.tick();
    assert.equal(tick3.status, 'done');
    assert.equal(tick3.jobClass, 'engine');
    assert.equal(tick3.lane, 'gemini-4-argon');
    assert.equal(tick3.modelPickedBy, 'floor');
    assert.equal(callIndex, 2, 'Panda must not be called when header + engine floor decide the model');
    assert.equal(seen[2].lane, 'gemini-4-argon');

    const log3Lines = fs
      .readFileSync(path.join(folders.done, '03-engine-floor-lower-header.log'), 'utf8')
      .split(/\r?\n/);
    assert.ok(log3Lines[0].startsWith('model: gemini-4-argon (picked by: floor) | code map: '), log3Lines[0]);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('cold pick from Panda: never runs a cold model; on lane engine with Argon cold uses Opus 5.5, and if both floor models are cold behaves as before this PR', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-panda-cold-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const now = new Date('2026-11-14T12:00:00Z');

    const t1 = path.join(folders.queued, '01-cold-sonnet-normal.md');
    const t2 = path.join(folders.queued, '02-engine-argon-cold-panda-argon.md');
    const t3 = path.join(folders.queued, '03-engine-argon-cold-panda-flash.md');
    const t4 = path.join(folders.queued, '04-engine-both-floor-cold.md');

    fs.writeFileSync(
      t1,
      ['# Fix README typo', '', 'Fix typo in docs/README.md.'].join('\n'),
      'utf8'
    );
    fs.utimesSync(t1, new Date('2026-11-14T01:00:00Z'), new Date('2026-11-14T01:00:00Z'));

    fs.writeFileSync(
      t2,
      ['# Optimize WebGPU bloom pass', 'lane: engine', '', 'Tune src/shaders/bloom.wgsl.'].join('\n'),
      'utf8'
    );
    fs.utimesSync(t2, new Date('2026-11-14T02:00:00Z'), new Date('2026-11-14T02:00:00Z'));

    fs.writeFileSync(
      t3,
      ['# Optimize WebGPU fog pass', 'lane: engine', '', 'Tune src/shaders/fog.wgsl.'].join('\n'),
      'utf8'
    );
    fs.utimesSync(t3, new Date('2026-11-14T03:00:00Z'), new Date('2026-11-14T03:00:00Z'));

    fs.writeFileSync(
      t4,
      ['# Optimize WebGPU postfx pass', 'lane: engine', '', 'Tune src/shaders/postfx.wgsl.'].join(
        '\n'
      ),
      'utf8'
    );
    fs.utimesSync(t4, new Date('2026-11-14T04:00:00Z'), new Date('2026-11-14T04:00:00Z'));

    let nextPandaCard = 'claude-sonnet-5.5';
    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: createFakeAdapter(tmpRoot, seen),
      commandRunner: runner,
      now: () => now,
      pandaPool: { ...DEFAULT_PANDA_POOL },
      pandaFetch: (async () =>
        new Response(JSON.stringify({ choice: { model_id: nextPandaCard } }), {
          status: 200,
        })) as typeof fetch,
    });

    // 1. Non-engine task: mark claude-sonnet-5-5 cold, Panda picks claude-sonnet-5.5 -> falls back to gemini-3.8-flash
    inboxRunner.getRouter().reportQuotaError('claude-sonnet-5-5', 'HTTP 429 quota exceeded', now);
    const tick1 = await inboxRunner.tick();
    assert.equal(tick1.status, 'done');
    assert.equal(tick1.lane, 'gemini-3.8-flash');
    assert.equal(tick1.modelPickedBy, 'fallback');
    const log1 = fs.readFileSync(path.join(folders.done, '01-cold-sonnet-normal.log'), 'utf8');
    assert.match(log1, /\[panda\] fallback to gemini-3\.8-flash: Panda \/route selected cold lane claude-sonnet-5-5/);

    // 2. Engine task with gemini-4-argon cold (and claude-opus-5-5 warm):
    //    Reset router cold state by creating a fresh runner or clearing via a fresh InboxRunner for clean cold state
    const seenEngine: DispatchJobInput[] = [];
    const engineRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions-engine.log'),
      adapter: createFakeAdapter(tmpRoot, seenEngine),
      commandRunner: runner,
      now: () => now,
      pandaPool: { ...DEFAULT_PANDA_POOL },
      pandaFetch: (async () =>
        new Response(JSON.stringify({ choice: { model_id: nextPandaCard } }), {
          status: 200,
        })) as typeof fetch,
    });
    engineRunner.getRouter().reportQuotaError('gemini-4-argon', 'HTTP 429 quota exceeded', now);

    // 2a. Panda picks cold gemini-4-argon -> never runs cold Argon; uses the other floor model claude-opus-5-5
    nextPandaCard = 'openrouter-gemini-4-argon';
    const tick2 = await engineRunner.tick();
    assert.equal(tick2.status, 'done');
    assert.equal(tick2.jobClass, 'engine');
    assert.equal(tick2.lane, 'claude-opus-5-5');
    assert.equal(tick2.modelPickedBy, 'fallback');
    assert.equal(seenEngine[0].lane, 'claude-opus-5-5');
    const log2 = fs.readFileSync(
      path.join(folders.done, '02-engine-argon-cold-panda-argon.log'),
      'utf8'
    );
    assert.ok(log2.split(/\r?\n/)[0].startsWith('model: claude-opus-5-5 (picked by: fallback) | code map: '), log2.split(/\r?\n/)[0]);
    assert.match(
      log2,
      /\[panda\] fallback to claude-opus-5-5: Panda \/route selected cold lane gemini-4-argon/
    );

    // 2b. Panda picks warm below-floor gemini-3.8-flash while gemini-4-argon is cold -> floor uses the other floor model claude-opus-5-5
    nextPandaCard = 'openrouter-gemini-3.8-flash';
    const tick3 = await engineRunner.tick();
    assert.equal(tick3.status, 'done');
    assert.equal(tick3.jobClass, 'engine');
    assert.equal(tick3.lane, 'claude-opus-5-5');
    assert.equal(tick3.modelPickedBy, 'floor');
    assert.equal(seenEngine[1].lane, 'claude-opus-5-5');
    const log3 = fs.readFileSync(
      path.join(folders.done, '03-engine-argon-cold-panda-flash.log'),
      'utf8'
    );
    assert.ok(log3.split(/\r?\n/)[0].startsWith('model: claude-opus-5-5 (picked by: floor) | code map: '), log3.split(/\r?\n/)[0]);

    // 2c. Both floor models (gemini-4-argon and claude-opus-5-5) are cold -> the engine ladder
    // walks on to its next warm rung instead of stopping (claude-sonnet-5-5, then last-resort).
    engineRunner.getRouter().reportQuotaError('claude-opus-5-5', 'HTTP 429 quota exceeded', now);
    nextPandaCard = 'openrouter-gemini-4-argon';
    const tick4 = await engineRunner.tick();
    assert.equal(tick4.status, 'done', tick4.reason ?? '');
    assert.equal(tick4.jobClass, 'engine');
    assert.equal(tick4.lane, 'last-resort');
    assert.equal(tick4.modelPickedBy, 'fallback');
    assert.equal(seenEngine[2].lane, 'last-resort');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('fallback: when Panda is down, slow, returns malformed JSON or missing model_id, or returns a model not in the pool, the runner logs one line, falls back to JevRouter, and logs fallback on line 1', async () => {
  const scenarios: Array<{
    name: string;
    pandaFetch: typeof fetch;
    timeoutMs?: number;
    expectedReasonSubstring: string;
  }> = [
    {
      name: 'down',
      pandaFetch: (async () => {
        throw new Error('connect ECONNREFUSED 192.168.0.40:8765');
      }) as unknown as typeof fetch,
      expectedReasonSubstring: 'Panda /route unreachable',
    },
    {
      name: 'slow',
      timeoutMs: 25,
      pandaFetch: (async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
        return new Response(JSON.stringify({ choice: { model_id: 'claude-sonnet-5.5' } }), {
          status: 200,
        });
      }) as typeof fetch,
      expectedReasonSubstring: 'Panda /route timed out',
    },
    {
      name: 'not-in-pool',
      pandaFetch: (async () =>
        new Response(JSON.stringify({ choice: { model_id: 'openrouter-gpt-6.1-sol' } }), {
          status: 200,
        })) as typeof fetch,
      expectedReasonSubstring: 'is not in pool',
    },
    {
      name: 'malformed-json',
      pandaFetch: (async () =>
        new Response('{malformed-json', {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch,
      expectedReasonSubstring: 'Panda /route unreachable',
    },
    {
      name: 'missing-model-id',
      pandaFetch: (async () =>
        new Response(JSON.stringify({ choice: {} }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })) as typeof fetch,
      expectedReasonSubstring: 'Panda /route returned no model_id',
    },
  ];

  for (const scenario of scenarios) {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `jev-panda-fb-${scenario.name}-`));
    try {
      const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
      const folders = ensureInboxFolders(inboxDir);
      fs.writeFileSync(
        path.join(folders.queued, `fb-${scenario.name}.md`),
        ['# Fix typo in README', '', 'Fix typo in docs/README.md.'].join('\n'),
        'utf8'
      );

      const seen: DispatchJobInput[] = [];
      const { runner } = createMockInboxCommandRunner();
      const inboxRunner = new InboxRunner({
        inboxDir,
        worktreeParentDir: path.join(tmpRoot, 'antigravity'),
        decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
        adapter: createFakeAdapter(tmpRoot, seen),
        commandRunner: runner,
        pandaPool: { ...DEFAULT_PANDA_POOL },
        pandaTimeoutMs: scenario.timeoutMs ?? 2_000,
        pandaFetch: scenario.pandaFetch,
      });

      const tick = await inboxRunner.tick();
      assert.equal(tick.status, 'done', `${scenario.name}: wheel must never stop`);
      assert.equal(tick.lane, 'gemini-3.8-flash');
      assert.equal(tick.modelPickedBy, 'fallback');
      assert.equal(seen.length, 1);
      assert.equal(seen[0].lane, 'gemini-3.8-flash');

      const logContent = fs.readFileSync(
        path.join(folders.done, `fb-${scenario.name}.log`),
        'utf8'
      );
      const logLines = logContent.split(/\r?\n/).filter(Boolean);
      assert.ok(logLines[0].startsWith('model: gemini-3.8-flash (picked by: fallback) | code map: '), logLines[0]);
      assert.ok(
        logLines.some(
          (line) =>
            line.startsWith('[panda] fallback to gemini-3.8-flash:') &&
            line.includes(scenario.expectedReasonSubstring)
        ),
        `expected one-line Panda fallback log for ${scenario.name}, got:\n${logContent}`
      );
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }
});

test('quota reset cooldown: parses Resets in 1h20m9s, 29m23s, and 45s (+5m), defaults to 2h constant on missing or nonsense time, keeps a reset past a day, and logs until + source', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-quota-reset-parse-'));
  try {
    const now = new Date('2026-11-15T07:04:45.000Z');
    const router = new JevRouter({ decisionsLogPath: path.join(tmpRoot, 'decisions.log') });

    assert.equal(DEFAULT_QUOTA_COOLDOWN_HOURS, 2);
    assert.equal(DEFAULT_QUOTA_COOLDOWN_MS, 2 * 3_600_000);
    assert.equal(QUOTA_RESET_BUFFER_MS, 5 * 60_000);
    assert.equal(MIN_QUOTA_COOLDOWN_MS, 5 * 60_000);
    assert.equal(MAX_QUOTA_COOLDOWN_MS, 14 * 24 * 3_600_000);

    // 1. Form 1: 'Resets in 1h20m9s' -> 1h20m9s (4,809,000 ms) + 5m (300,000 ms) = 1h25m9s (5,109,000 ms)
    const report1 = router.reportQuotaError(
      'claude-opus-5-5',
      'AGY_ERROR: {"short_error":"RESOURCE_EXHAUSTED (code 429): Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 1h20m9s."}',
      now
    );
    const expectedUntil1 = new Date(now.getTime() + (1 * 3_600_000 + 20 * 60_000 + 9 * 1_000) + 5 * 60_000).toISOString();
    assert.equal(report1.durationMs, 5_109_000);
    assert.equal(report1.until, expectedUntil1);
    assert.equal(report1.source, 'message');
    assert.equal(report1.quotaGroup, 'agy-claude');
    assert.ok(report1.logLine.includes(expectedUntil1), report1.logLine);
    assert.ok(report1.logLine.includes('message'), report1.logLine);
    assert.ok(!report1.logLine.includes('default'), report1.logLine);

    // 2. Form 2: 'Resets in 29m23s' -> 29m23s (1,763,000 ms) + 5m (300,000 ms) = 34m23s (2,063,000 ms)
    const report2 = router.reportQuotaError(
      'claude-sonnet-5-5',
      'error: Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 29m23s.',
      now
    );
    const expectedUntil2 = new Date(now.getTime() + (29 * 60_000 + 23 * 1_000) + 5 * 60_000).toISOString();
    assert.equal(report2.durationMs, 2_063_000);
    assert.equal(report2.until, expectedUntil2);
    assert.equal(report2.source, 'message');
    assert.ok(report2.logLine.includes(expectedUntil2), report2.logLine);
    assert.ok(report2.logLine.includes('message'), report2.logLine);

    // 3. Form 3: 'Resets in 45s' -> 45s (45,000 ms) + 5m (300,000 ms) = 5m45s (345,000 ms)
    const report3 = router.reportQuotaError(
      'claude-opus-5-5',
      'RESOURCE_EXHAUSTED (code 429): Individual quota reached. Resets in 45s.',
      now
    );
    const expectedUntil3 = new Date(now.getTime() + 45 * 1_000 + 5 * 60_000).toISOString();
    assert.equal(report3.durationMs, 345_000);
    assert.equal(report3.until, expectedUntil3);
    assert.equal(report3.source, 'message');
    assert.ok(report3.logLine.includes(expectedUntil3), report3.logLine);
    assert.ok(report3.logLine.includes('message'), report3.logLine);

    // 4. No time in the text -> 2 hours (DEFAULT_QUOTA_COOLDOWN_HOURS), source: 'default'
    const reportNoTime = router.reportQuotaError(
      'claude-opus-5-5',
      'RESOURCE_EXHAUSTED (code 429): Individual quota reached.',
      now
    );
    const expectedUntilDefault = new Date(now.getTime() + DEFAULT_QUOTA_COOLDOWN_MS).toISOString();
    assert.equal(reportNoTime.hours, DEFAULT_QUOTA_COOLDOWN_HOURS);
    assert.equal(reportNoTime.durationMs, DEFAULT_QUOTA_COOLDOWN_MS);
    assert.equal(reportNoTime.until, expectedUntilDefault);
    assert.equal(reportNoTime.source, 'default');
    assert.ok(reportNoTime.logLine.includes(expectedUntilDefault), reportNoTime.logLine);
    assert.ok(reportNoTime.logLine.includes('default'), reportNoTime.logLine);
    assert.ok(!reportNoTime.logLine.includes('message'), reportNoTime.logLine);

    // 5. Nonsense times -> falls back to 2h default, and extreme times clamp to [5m, 24h]
    for (const nonsenseText of [
      'RESOURCE_EXHAUSTED (code 429): Resets in banana.',
      'RESOURCE_EXHAUSTED (code 429): Resets in ???',
      'RESOURCE_EXHAUSTED (code 429): Resets in -10m.',
      'RESOURCE_EXHAUSTED (code 429): Resets in NaNh.',
    ]) {
      const nonsenseReport = router.reportQuotaError('claude-opus-5-5', nonsenseText, now);
      assert.equal(nonsenseReport.durationMs, DEFAULT_QUOTA_COOLDOWN_MS, nonsenseText);
      assert.equal(nonsenseReport.hours, DEFAULT_QUOTA_COOLDOWN_HOURS, nonsenseText);
      assert.equal(nonsenseReport.source, 'default', nonsenseText);
      assert.ok(nonsenseReport.logLine.includes(expectedUntilDefault), nonsenseReport.logLine);
      assert.ok(nonsenseReport.logLine.includes('default'), nonsenseReport.logLine);
    }

    // The message's own reset time is kept even past a day: 48h + the 5m buffer stays 48h5m.
    const tooLongReport = router.reportQuotaError(
      'claude-opus-5-5',
      'RESOURCE_EXHAUSTED (code 429): Resets in 48h.',
      now
    );
    assert.equal(tooLongReport.durationMs, 48 * 3_600_000 + QUOTA_RESET_BUFFER_MS);
    assert.equal(tooLongReport.hours, (48 * 3_600_000 + QUOTA_RESET_BUFFER_MS) / 3_600_000);
    assert.equal(tooLongReport.source, 'message');

    // Clamp < 5m to 5m min
    const tooShortReport = router.reportQuotaError(
      'claude-opus-5-5',
      'HTTP 429 Too Many Requests: retry in 0.01 hours',
      now
    );
    assert.equal(tooShortReport.durationMs, MIN_QUOTA_COOLDOWN_MS);
    assert.equal(tooShortReport.hours, 5 / 60);
    assert.equal(tooShortReport.source, 'message');
    assert.equal(parseQuotaCooldown('Resets in 0s').durationMs, MIN_QUOTA_COOLDOWN_MS);

    // The reset the harness actually sent (127h) is kept, plus the 5 minute buffer,
    // and never shortened to one day.
    const longReset = router.reportQuotaError(
      'gemini-4-argon',
      'RESOURCE_EXHAUSTED: Individual quota reached. Resets in 127h.',
      now
    );
    assert.equal(longReset.source, 'message');
    assert.equal(longReset.durationMs, 127 * 3_600_000 + QUOTA_RESET_BUFFER_MS);
    assert.equal(
      longReset.until,
      new Date(now.getTime() + 127 * 3_600_000 + QUOTA_RESET_BUFFER_MS).toISOString()
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('a cold lane is never picked on any path: with Panda down and the first rung cold, the runner uses the next warm rung', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-panda-cold-skip-'));
  try {
    const now = new Date('2026-11-23T03:30:00.000Z');
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);

    fs.writeFileSync(
      path.join(folders.queued, '01-mechanical-cold-flash.md'),
      ['# Rename a helper', 'lane: mechanical', '', 'Rename formatDate in src/util/dates.ts.'].join('\n'),
      'utf8'
    );
    fs.writeFileSync(
      path.join(folders.queued, '02-code-hard-cold-argon.md'),
      ['# Fix the scheduler race', 'lane: code-hard', '', 'Fix the race in src/scheduler/queue.ts.'].join('\n'),
      'utf8'
    );

    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: createFakeAdapter(tmpRoot, seen),
      commandRunner: runner,
      now: () => now,
      pandaPool: { ...DEFAULT_PANDA_POOL },
      pandaFetch: (async () => {
        throw new Error('connect ECONNREFUSED 192.168.0.40:8765');
      }) as unknown as typeof fetch,
    });

    // The first rung of each ladder is cold, so the fallback path must walk past it.
    inboxRunner.getRouter().reportQuotaError('gemini-3.8-flash', 'HTTP 429 quota exceeded', now);
    const tick1 = await inboxRunner.tick();
    assert.equal(tick1.status, 'done');
    assert.equal(tick1.jobClass, 'mechanical');
    assert.notEqual(tick1.lane, 'gemini-3.8-flash');
    assert.equal(tick1.modelPickedBy, 'fallback');
    assert.equal(seen[0].lane, tick1.lane);

    inboxRunner.getRouter().reportQuotaError('gemini-4-argon', 'HTTP 429 quota exceeded', now);
    const tick2 = await inboxRunner.tick();
    assert.equal(tick2.status, 'done');
    assert.equal(tick2.jobClass, 'code-hard');
    assert.notEqual(tick2.lane, 'gemini-4-argon');
    assert.equal(tick2.modelPickedBy, 'fallback');
    assert.equal(seen[1].lane, tick2.lane);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('a quota error mid-run never retries on a lane that is already cold', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-panda-quota-retry-'));
  try {
    const now = new Date('2026-11-23T03:35:00.000Z');
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, '01-code-hard-quota.md'),
      ['# Fix the scheduler race', 'lane: code-hard', '', 'Fix the race in src/scheduler/queue.ts.'].join('\n'),
      'utf8'
    );

    const seen: DispatchJobInput[] = [];
    const quotaOutput =
      'RESOURCE_EXHAUSTED (code 429): Individual quota reached. Resets in 127h.';
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: {
        name: 'agy',
        async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
          seen.push(input);
          const exhausted = seen.length === 1;
          return {
            jobId: input.jobId ?? 'mock-job',
            adapter: 'agy',
            lane: input.lane,
            harness: 'agy',
            promptPath: path.join(tmpRoot, 'prompt.txt'),
            sanitizedPrompt: input.prompt,
            mode: 'headless-cli',
            httpSessionSupported: false,
            note: 'mock lane run without agy',
            poll: async () => ({
              done: true,
              prUrl: exhausted ? null : parsePrUrlFromOutput(`Opened pull request ${MOCK_PR_URL}`),
              output: exhausted ? quotaOutput : `Opened pull request ${MOCK_PR_URL}`,
              error: exhausted ? quotaOutput : null,
              exitCode: exhausted ? 1 : 0,
            }),
          };
        },
      },
      commandRunner: runner,
      now: () => now,
      pandaPool: { ...DEFAULT_PANDA_POOL },
      pandaFetch: (async () => {
        throw new Error('connect ECONNREFUSED 192.168.0.40:8765');
      }) as unknown as typeof fetch,
    });

    // claude-opus-5-5 is already cold, so the first attempt lands on gemini-4-argon and then
    // that lane reports its own quota. The retry must not go back to the cold lane.
    inboxRunner.getRouter().reportQuotaError('claude-opus-5-5', 'HTTP 429 quota exceeded', now);
    const tick = await inboxRunner.tick();
    assert.equal(tick.quotaFallbackTriggered, true);
    assert.equal(seen.length, 2);
    assert.equal(seen[0].lane, 'gemini-4-argon');
    const cold = inboxRunner.getRouter().getActiveColdLanes(now);
    assert.equal(Boolean(cold[seen[1].lane]), false, `retry used cold lane ${seen[1].lane}`);
    assert.notEqual(seen[1].lane, seen[0].lane);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('quota group warms again once reset time + 5m has passed and is then picked by Panda instead of the fallback', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-panda-rewarm-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);

    const t1 = path.join(folders.queued, '01-hit-429.md');
    const t2 = path.join(folders.queued, '02-while-cold.md');
    const t3 = path.join(folders.queued, '03-after-reset.md');

    fs.writeFileSync(
      t1,
      ['# Refactor renderer pipeline', 'lane: engine', '', 'Update src/renderer/pipeline.ts.'].join('\n'),
      'utf8'
    );
    fs.utimesSync(t1, new Date('2026-11-15T07:50:00Z'), new Date('2026-11-15T07:50:00Z'));

    fs.writeFileSync(
      t2,
      ['# Refactor camera controller', 'lane: engine', '', 'Update src/renderer/camera.ts.'].join('\n'),
      'utf8'
    );
    fs.utimesSync(t2, new Date('2026-11-15T07:51:00Z'), new Date('2026-11-15T07:51:00Z'));

    fs.writeFileSync(
      t3,
      ['# Refactor lighting pass', 'lane: engine', '', 'Update src/renderer/lighting.ts.'].join('\n'),
      'utf8'
    );
    fs.utimesSync(t3, new Date('2026-11-15T07:52:00Z'), new Date('2026-11-15T07:52:00Z'));

    let currentTime = new Date('2026-11-15T07:55:31.000Z');
    const expectedColdUntil = new Date(
      currentTime.getTime() + (29 * 60_000 + 23 * 1_000) + 5 * 60_000
    ).toISOString();

    const dispatchedLanes: string[] = [];
    let firstOpusAttemptFailedWith429 = false;

    const adapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        dispatchedLanes.push(input.lane);
        const failWith429 = input.lane === 'claude-opus-5-5' && !firstOpusAttemptFailedWith429;
        if (failWith429) {
          firstOpusAttemptFailedWith429 = true;
        }
        const err429Output = [
          'error: Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 29m23s.',
          'AGY_ERROR: {"short_error":"RESOURCE_EXHAUSTED (code 429): Individual quota reached. Please upgrade your subscription to increase your limits. Resets in 29m23s.","status":"RESOURCE_EXHAUSTED","error_code":429}',
        ].join('\n');
        const okOutput = `Opened pull request ${MOCK_PR_URL}`;

        return {
          jobId: input.jobId ?? 'mock-job',
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(tmpRoot, 'prompt.txt'),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock lane run',
          poll: async () =>
            failWith429
              ? {
                  done: true,
                  prUrl: null,
                  output: err429Output,
                  error: err429Output,
                  exitCode: 3,
                }
              : {
                  done: true,
                  prUrl: MOCK_PR_URL,
                  output: okOutput,
                  exitCode: 0,
                },
        };
      },
    };

    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter,
      commandRunner: runner,
      now: () => currentTime,
      pandaPool: { ...DEFAULT_PANDA_POOL },
      pandaFetch: (async () =>
        new Response(JSON.stringify({ choice: { model_id: 'claude-opus-5.5' } }), {
          status: 200,
        })) as typeof fetch,
    });

    // Tick 1 at t0: Panda picks claude-opus-5-5, attempt 1 hits 429 ('Resets in 29m23s'),
    // runner marks agy-claude cold until t0 + 34m23s and completes on fallback gemini-4-argon.
    const tick1 = await inboxRunner.tick();
    assert.equal(tick1.status, 'done');
    assert.equal(tick1.quotaFallbackTriggered, true);
    assert.equal(tick1.lane, 'gemini-4-argon');
    assert.equal(tick1.modelPickedBy, 'fallback');

    const log1 = fs.readFileSync(path.join(folders.done, '01-hit-429.log'), 'utf8');
    assert.ok(
      log1.includes(`cold until ${expectedColdUntil}`) && log1.includes('message'),
      `Expected cold log line with until=${expectedColdUntil} and source=message, got:\n${log1}`
    );

    // Tick 2 at t0 + 20m (before 34m23s reset+buffer): agy-claude is still cold -> falls back to gemini-4-argon
    currentTime = new Date(currentTime.getTime() + 20 * 60_000);
    const tick2 = await inboxRunner.tick();
    assert.equal(tick2.status, 'done');
    assert.equal(tick2.lane, 'gemini-4-argon');
    assert.equal(tick2.modelPickedBy, 'fallback');

    // Tick 3 at t0 + 35m (after 34m23s reset+buffer, well before 2h/24h):
    // agy-claude has warmed again and Panda's pick of claude-opus-5-5 is used instead of the fallback!
    currentTime = new Date(currentTime.getTime() + 15 * 60_000);
    const tick3 = await inboxRunner.tick();
    assert.equal(tick3.status, 'done');
    assert.equal(tick3.lane, 'claude-opus-5-5');
    assert.equal(tick3.modelPickedBy, 'panda');

    const log3FirstLine = fs
      .readFileSync(path.join(folders.done, '03-after-reset.log'), 'utf8')
      .split(/\r?\n/)[0];
    assert.ok(
      log3FirstLine.startsWith('model: claude-opus-5-5 (picked by: panda) | code map: '),
      log3FirstLine
    );
    assert.deepEqual(dispatchedLanes, [
      'claude-opus-5-5',
      'gemini-4-argon',
      'gemini-4-argon',
      'claude-opus-5-5',
    ]);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
