import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  parsePrUrlFromOutput,
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

test('askPandaRoute: returns null when Panda is down, slow, or answers a model not in the pool', async () => {
  // 1. Down (connection error)
  const downPick = await askPandaRoute('Fix typo', {
    pool: { ...DEFAULT_PANDA_POOL },
    fetchImpl: (async () => {
      throw new Error('connect ECONNREFUSED 127.0.0.1:8765');
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
    assert.equal(logLines[0], formatTaskLogFirstLine('claude-sonnet-5-5', 'panda'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('header override: task header model line wins over Panda and logs header on first line of task log', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-panda-header-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'header-override.md'),
      [
        '# Add unit test for helper',
        'model: gemini-3.8-flash',
        '',
        'Add a unit test in src/utils/math.test.ts.',
      ].join('\n'),
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
        new Response(JSON.stringify({ choice: { model_id: 'claude-opus-5.5' } }), {
          status: 200,
        })) as typeof fetch,
    });

    const tick = await inboxRunner.tick();
    assert.equal(tick.status, 'done');
    assert.equal(tick.lane, 'gemini-3.8-flash');
    assert.equal(tick.modelPickedBy, 'header');
    assert.equal(seen.length, 1);
    assert.equal(seen[0].lane, 'gemini-3.8-flash');

    const logLines = fs
      .readFileSync(path.join(folders.done, 'header-override.log'), 'utf8')
      .split(/\r?\n/);
    assert.equal(logLines[0], 'model: gemini-3.8-flash (picked by: header)');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('engine floor: lane engine never runs below claude-opus-5-5 or gemini-4-argon and logs floor on first line of task log', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-panda-floor-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);

    const t1 = path.join(folders.queued, '01-engine-floor-flash.md');
    const t2 = path.join(folders.queued, '02-engine-floor-opus.md');
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
    assert.equal(log1Lines[0], 'model: gemini-4-argon (picked by: floor)');

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
    assert.equal(log2Lines[0], 'model: claude-opus-5-5 (picked by: panda)');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('fallback: when Panda is down, slow, or returns a model not in the pool, the runner logs one line, falls back to JevRouter, and logs fallback on line 1', async () => {
  const scenarios: Array<{
    name: string;
    pandaFetch: typeof fetch;
    timeoutMs?: number;
    expectedReasonSubstring: string;
  }> = [
    {
      name: 'down',
      pandaFetch: (async () => {
        throw new Error('connect ECONNREFUSED 127.0.0.1:8765');
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
      assert.equal(logLines[0], 'model: gemini-3.8-flash (picked by: fallback)');
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
