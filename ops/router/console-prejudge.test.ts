import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readDecisionLog } from './dream-task-router.ts';
import { runPrejudge, type GhRunner } from './console-prejudge.ts';

// The fake key is built from pieces so the secret scan never sees a whole key in this file.
const fakeKey = ['sk-ant-console', 'testonly123456789'].join('-');
const OPENING = "First read by claude-sonnet-5-5 on the Console credit. This is not the judge's verdict.";

interface Harness {
  ghCalls: Array<{ args: string[]; input?: string }>;
  fetchBodies: Array<Record<string, any>>;
  lines: string[];
  runGh: GhRunner;
  fetchImpl: (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<any>;
  logPath: string;
}

function makeHarness(dir: string, options?: { diff?: string; failComment?: boolean }): Harness {
  const ghCalls: Harness['ghCalls'] = [];
  const fetchBodies: Harness['fetchBodies'] = [];
  const runGh: GhRunner = (args, input) => {
    ghCalls.push({ args, input });
    if (args[0] === 'pr' && args[1] === 'view') {
      return JSON.stringify({ title: 'Add widget lane', body: 'This adds the widget lane and says it is faster.' });
    }
    if (args[0] === 'pr' && args[1] === 'diff') {
      return options?.diff ?? 'diff --git a/src/widget.ts b/src/widget.ts\n+export const widget = 1;\n';
    }
    if (args[0] === 'pr' && args[1] === 'comment') {
      if (options?.failComment) throw new Error('gh comment failed');
      return '';
    }
    throw new Error(`unexpected gh call: ${args.join(' ')}`);
  };
  const fetchImpl = async (_url: string, init: { method: string; headers: Record<string, string>; body: string }) => {
    fetchBodies.push(JSON.parse(init.body));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: 'text', text: '1. What changed: src/widget.ts:1 adds a constant.' }],
        usage: { input_tokens: 400, output_tokens: 60 },
      }),
      text: async () => 'ok',
    };
  };
  return { ghCalls, fetchBodies, lines: [], runGh, fetchImpl, logPath: path.join(dir, 'decisions.log') };
}

function envOn(extra: Record<string, string> = {}): Record<string, string> {
  return {
    ROUTER_CONSOLE_ENABLED: 'true',
    ROUTER_CONSOLE_DAILY_CAP: '20',
    ROUTER_CONSOLE_TOKEN_BUDGET: '50000',
    CLAUDE_CONSOLE_KEY: fakeKey,
    ...extra,
  };
}

async function withHarness(
  fn: (h: Harness) => Promise<void>,
  options?: { diff?: string; failComment?: boolean }
): Promise<void> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'console-prejudge-'));
  try {
    await fn(makeHarness(dir, options));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function run(h: Harness, argv: string[], env: Record<string, string>): Promise<number> {
  return runPrejudge(argv, {
    env,
    decisionsLogPath: h.logPath,
    fetchImpl: h.fetchImpl,
    runGh: h.runGh,
    write: (line) => h.lines.push(line),
  });
}

test('Console credit step 4: switched off prints one line, exits 0 and touches neither gh nor the API', async () => {
  const offEnvs: Array<Record<string, string>> = [{ ROUTER_CONSOLE_ENABLED: 'false' }, {}];
  for (const env of offEnvs) {
    await withHarness(async (h) => {
      const code = await run(h, ['Trollz1004/dream-online', '42'], env);
      assert.equal(code, 0);
      assert.equal(h.lines.length, 1);
      assert.match(h.lines[0], /switched off/i);
      assert.equal(h.ghCalls.length, 0);
      assert.equal(h.fetchBodies.length, 0);
    });
  }
});

test('Console credit step 4: reads title, body and diff with gh, sends pre-judge, and posts the answer as a PR comment', async () => {
  await withHarness(async (h) => {
    const code = await run(h, ['Trollz1004/dream-online', '42'], envOn());
    assert.equal(code, 0, h.lines.join('\n'));

    assert.deepEqual(
      h.ghCalls.map((c) => c.args.slice(0, 3)),
      [
        ['pr', 'view', '42'],
        ['pr', 'diff', '42'],
        ['pr', 'comment', '42'],
      ]
    );
    for (const call of h.ghCalls) {
      const repoIdx = call.args.indexOf('--repo');
      assert.ok(repoIdx > 0 && call.args[repoIdx + 1] === 'Trollz1004/dream-online');
    }

    // One API call, with the default model and a prompt that carries the PR and the four asks.
    assert.equal(h.fetchBodies.length, 1);
    assert.equal(h.fetchBodies[0].model, 'claude-sonnet-5-5');
    const prompt = String(h.fetchBodies[0].messages[0].content);
    assert.ok(prompt.includes('Add widget lane'), 'title in prompt');
    assert.ok(prompt.includes('says it is faster'), 'body in prompt');
    assert.ok(prompt.includes('export const widget = 1;'), 'diff in prompt');
    assert.match(prompt, /what changed/i);
    assert.match(prompt, /more than the code or the site supports/i);
    assert.match(prompt, /cannot fail/i);
    assert.match(prompt, /file and line/i);

    // The comment begins with the fixed opening and carries the answer.
    const comment = h.ghCalls[2].input ?? '';
    assert.ok(comment.startsWith(OPENING), `comment must begin with the opening, got: ${comment.slice(0, 120)}`);
    assert.ok(comment.includes('src/widget.ts:1 adds a constant.'));

    // The call is logged under the Console lane with token counts only.
    const logged = readDecisionLog(h.logPath);
    assert.equal(logged.length, 1);
    assert.equal(logged[0].lane, 'console-credit');
    assert.equal(logged[0].token_count, 460);
    assert.match(logged[0].reason, /pre-judge/);

    // The key is in nothing that leaves the process, nothing printed, nothing logged.
    const everything = [comment, h.lines.join('\n'), fs.readFileSync(h.logPath, 'utf8'), JSON.stringify(h.ghCalls)].join('\n');
    assert.ok(!everything.includes(fakeKey));
  });
});

test('Console credit step 4: the comment opening names the model from ROUTER_CONSOLE_MODEL', async () => {
  await withHarness(async (h) => {
    const code = await run(h, ['Trollz1004/dream-online', '7'], envOn({ ROUTER_CONSOLE_MODEL: 'claude-opus-5-5' }));
    assert.equal(code, 0, h.lines.join('\n'));
    assert.equal(h.fetchBodies[0].model, 'claude-opus-5-5');
    assert.ok(
      (h.ghCalls[2].input ?? '').startsWith(
        "First read by claude-opus-5-5 on the Console credit. This is not the judge's verdict."
      )
    );
  });
});

test('Console credit step 4: a refused lane (budget reached) exits 1 with one plain line and posts nothing', async () => {
  await withHarness(async (h) => {
    fs.writeFileSync(
      h.logPath,
      `${JSON.stringify({
        timestamp: '2026-11-20T10:00:00.000Z',
        lane: 'console-credit',
        token_count: 900,
        console_tokens: { input_tokens: 800, output_tokens: 100, total_tokens: 900 },
      })}\n`,
      'utf8'
    );
    const code = await run(h, ['Trollz1004/dream-online', '42'], envOn({ ROUTER_CONSOLE_TOKEN_BUDGET: '900' }));
    assert.equal(code, 1);
    assert.equal(h.lines.length, 1);
    assert.match(h.lines[0], /token budget \(900\) reached/);
    assert.equal(h.fetchBodies.length, 0);
    assert.ok(!h.ghCalls.some((c) => c.args[1] === 'comment'));
  });
});

test('Console credit step 4: bad arguments and a repo owned by someone else exit 2 before any gh call', async () => {
  const badArgs = [[], ['Trollz1004/dream-online'], ['Trollz1004/dream-online', 'abc'], ['Trollz1004/dream-online', '0'], ['dream-online', '5'], ['someone-else/dream-online', '5']];
  for (const argv of badArgs) {
    await withHarness(async (h) => {
      const code = await run(h, argv, envOn());
      assert.equal(code, 2, JSON.stringify(argv));
      assert.equal(h.lines.length, 1);
      assert.equal(h.ghCalls.length, 0);
      assert.equal(h.fetchBodies.length, 0);
    });
  }
});

test('Console credit step 4: a very large diff is cut with a visible note before it is sent', async () => {
  await withHarness(
    async (h) => {
      const code = await run(h, ['Trollz1004/dream-online', '42'], envOn());
      assert.equal(code, 0, h.lines.join('\n'));
      const prompt = String(h.fetchBodies[0].messages[0].content);
      assert.ok(prompt.length < 100_000, `prompt was ${prompt.length} characters`);
      assert.match(prompt, /diff cut at \d+ characters/);
    },
    { diff: `diff --git a/big.txt b/big.txt\n${'+line of text\n'.repeat(20_000)}` }
  );
});

test('Console credit step 4: when gh cannot post the comment the command exits 1 and says so in one line', async () => {
  await withHarness(
    async (h) => {
      const code = await run(h, ['Trollz1004/dream-online', '42'], envOn());
      assert.equal(code, 1);
      assert.equal(h.lines.length, 1);
      assert.match(h.lines[0], /could not post/i);
    },
    { failComment: true }
  );
});
