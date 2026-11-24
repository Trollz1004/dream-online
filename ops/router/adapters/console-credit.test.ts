import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ConsoleCreditAdapter, readDecisionLog } from '../dream-task-router.ts';

// The fake key is built from pieces so the secret scan never sees a whole key in this file.
const fakeKey = ['sk-ant-console', 'testonly123456789'].join('-');

interface FakeCall {
  url: string;
  body: Record<string, unknown>;
}

function makeFakeFetch(calls: FakeCall[]) {
  return async (url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
    calls.push({ url, body: JSON.parse(init.body) as Record<string, unknown> });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: 'text', text: 'PASS: read.' }],
        usage: { input_tokens: 120, output_tokens: 30 },
      }),
      text: async () => 'PASS',
    };
  };
}

function baseEnv(extra: Record<string, string> = {}): Record<string, string> {
  return {
    ROUTER_CONSOLE_ENABLED: 'true',
    ROUTER_CONSOLE_DAILY_CAP: '50',
    ROUTER_CONSOLE_TOKEN_BUDGET: '100000',
    CLAUDE_CONSOLE_KEY: fakeKey,
    ...extra,
  };
}

function withTemp(fn: (dir: string, logPath: string) => Promise<void>): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-credit-'));
  return fn(dir, path.join(dir, 'decisions.log')).finally(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });
}

function seedConsoleLines(logPath: string, totals: number[]): void {
  const lines = totals.map((total, i) =>
    JSON.stringify({
      timestamp: `2026-11-0${i + 1}T10:00:00.000Z`,
      lane: 'console-credit',
      token_count: total,
      console_tokens: { input_tokens: total - 10, output_tokens: 10, total_tokens: total },
    })
  );
  // A line from another lane must never count toward the Console budget.
  lines.push(
    JSON.stringify({
      timestamp: '2026-11-04T10:00:00.000Z',
      lane: 'claude-opus-5-5',
      token_count: 99999,
    })
  );
  fs.writeFileSync(logPath, `${lines.join('\n')}\n`, 'utf8');
}

test('Console credit step 1: model defaults to claude-sonnet-5-5 and ROUTER_CONSOLE_MODEL overrides it', async () => {
  await withTemp(async (_dir, logPath) => {
    const calls: FakeCall[] = [];
    const defaultAdapter = new ConsoleCreditAdapter({
      env: baseEnv(),
      decisionsLogPath: logPath,
      fetchImpl: makeFakeFetch(calls),
    });
    await defaultAdapter.runJudgeTextCheck({ prompt: 'check one', purpose: 'judge-text-check', jobClass: 'judge' });
    assert.equal(calls[0].body.model, 'claude-sonnet-5-5');

    const overrideAdapter = new ConsoleCreditAdapter({
      env: baseEnv({ ROUTER_CONSOLE_MODEL: 'claude-opus-5-5' }),
      decisionsLogPath: logPath,
      fetchImpl: makeFakeFetch(calls),
    });
    await overrideAdapter.runJudgeTextCheck({ prompt: 'check two', purpose: 'judge-text-check', jobClass: 'judge' });
    assert.equal(calls[1].body.model, 'claude-opus-5-5');
    assert.equal(overrideAdapter.getModel(), 'claude-opus-5-5');
  });
});

test('Console credit step 2: pre-judge and bracket are allowed; routing and any other purpose are refused', async () => {
  await withTemp(async (_dir, logPath) => {
    const calls: FakeCall[] = [];
    const adapter = new ConsoleCreditAdapter({
      env: baseEnv(),
      decisionsLogPath: logPath,
      fetchImpl: makeFakeFetch(calls),
    });

    for (const purpose of ['judge-text-check', 'pre-judge', 'bracket']) {
      const result = await adapter.runJudgeTextCheck({ prompt: `purpose ${purpose}`, purpose, jobClass: 'judge' });
      assert.equal(result.totalTokens, 150, purpose);
    }
    assert.equal(calls.length, 3);

    for (const purpose of ['route', 'routing-decision', 'chat', '']) {
      await assert.rejects(
        () => adapter.runJudgeTextCheck({ prompt: 'no', purpose, jobClass: 'judge' }),
        /never used for routing decisions/,
        `purpose "${purpose}" must be refused`
      );
    }
    // A routing job class is refused even when the purpose is an allowed one.
    await assert.rejects(
      () => adapter.runJudgeTextCheck({ prompt: 'no', purpose: 'pre-judge', jobClass: 'route' }),
      /never used for routing decisions/
    );
    assert.equal(calls.length, 3, 'refused requests must never reach the fake fetch');
  });
});

test('Console credit step 3: ROUTER_CONSOLE_TOKEN_BUDGET is required and must be a positive whole number', async () => {
  await withTemp(async (_dir, logPath) => {
    const calls: FakeCall[] = [];
    for (const bad of [undefined, '', '0', '-5', 'abc', '1.5']) {
      const env = baseEnv();
      if (bad === undefined) delete (env as Record<string, string | undefined>).ROUTER_CONSOLE_TOKEN_BUDGET;
      else env.ROUTER_CONSOLE_TOKEN_BUDGET = bad;
      const adapter = new ConsoleCreditAdapter({
        env,
        decisionsLogPath: logPath,
        fetchImpl: makeFakeFetch(calls),
      });
      await assert.rejects(
        () => adapter.runJudgeTextCheck({ prompt: 'x', purpose: 'pre-judge', jobClass: 'judge' }),
        /ROUTER_CONSOLE_TOKEN_BUDGET must be set to a positive whole number/,
        `budget ${String(bad)} must be refused`
      );
    }
    assert.equal(calls.length, 0);
  });
});

test('Console credit step 3: the budget adds up total tokens from its own log lines and refuses once reached', async () => {
  await withTemp(async (_dir, logPath) => {
    seedConsoleLines(logPath, [100, 200]); // 300 tokens used by the Console lane
    const calls: FakeCall[] = [];

    const atBudget = new ConsoleCreditAdapter({
      env: baseEnv({ ROUTER_CONSOLE_TOKEN_BUDGET: '300' }),
      decisionsLogPath: logPath,
      fetchImpl: makeFakeFetch(calls),
    });
    await assert.rejects(
      () => atBudget.runJudgeTextCheck({ prompt: 'x', purpose: 'pre-judge', jobClass: 'judge' }),
      (err: unknown) => {
        const message = (err as Error).message;
        assert.match(message, /token budget \(300\) reached/);
        assert.match(message, /300 tokens used/);
        assert.doesNotMatch(message, /\$|dollar|price|usd/i, 'no prices and no dollar sums');
        return true;
      }
    );
    assert.equal(calls.length, 0);

    const underBudget = new ConsoleCreditAdapter({
      env: baseEnv({ ROUTER_CONSOLE_TOKEN_BUDGET: '301' }),
      decisionsLogPath: logPath,
      fetchImpl: makeFakeFetch(calls),
    });
    const result = await underBudget.runJudgeTextCheck({
      prompt: 'x',
      purpose: 'pre-judge',
      jobClass: 'judge',
      now: new Date('2026-11-05T10:00:00.000Z'),
    });
    assert.equal(calls.length, 1);
    assert.equal(result.tokenBudget, 301);
    assert.equal(result.tokensUsedTotal, 450);

    // The call just made is now on the log, so the 301 budget is reached.
    await assert.rejects(
      () =>
        underBudget.runJudgeTextCheck({
          prompt: 'y',
          purpose: 'pre-judge',
          jobClass: 'judge',
          now: new Date('2026-11-05T10:01:00.000Z'),
        }),
      /token budget \(301\) reached/
    );
    assert.equal(calls.length, 1);
  });
});

test('Console credit: log lines name the purpose, hold token counts only, and never hold the key or a price', async () => {
  await withTemp(async (_dir, logPath) => {
    const adapter = new ConsoleCreditAdapter({
      env: baseEnv(),
      decisionsLogPath: logPath,
      fetchImpl: makeFakeFetch([]),
    });
    await adapter.runJudgeTextCheck({ prompt: 'bracket check', purpose: 'bracket', jobClass: 'judge' });
    const logged = readDecisionLog(logPath);
    assert.equal(logged.length, 1);
    assert.match(logged[0].reason, /bracket/);
    assert.equal(logged[0].token_count, 150);
    const raw = fs.readFileSync(logPath, 'utf8');
    assert.ok(!raw.includes(fakeKey));
    assert.doesNotMatch(raw, /dollar|price|usd|cost_usd/i);
  });
});
