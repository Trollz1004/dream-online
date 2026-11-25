import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  JevRouter,
  parsePrUrlFromOutput,
} from './dream-task-router.ts';
import { createMockInboxCommandRunner, ensureInboxFolders, InboxRunner } from './inbox-runner.ts';

test('LADDER-WALK quota error walks whole ladder ends on last-resort in done', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-ladder-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'ladder-task.md'),
      ['# Fix the queue helper', 'lane: mechanical', '', 'Fix the helper in src/utils/queue.ts.'].join('\n'),
      'utf8'
    );
    const QUOTA = 'AGY_ERROR: {"short_error":"RESOURCE_EXHAUSTED (code 429): Individual quota reached."}';
    const lanesCalled: string[] = [];
    const quotaLanes = new Set(['gemini-3.8-flash', 'claude-sonnet-5-5', 'claude-opus-5-5', 'gemini-4-argon']);
    const adapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        lanesCalled.push(input.lane);
        const cold = quotaLanes.has(input.lane);
        const output = cold
          ? QUOTA
          : 'Opened pull request https://github.com/Trollz1004/dream-online/pull/501';
        return {
          jobId: input.jobId ?? `job-${lanesCalled.length}`,
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(tmpRoot, `job-${lanesCalled.length}.txt`),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock whole-ladder quota walk',
          poll: async () => ({
            done: true,
            prUrl: parsePrUrlFromOutput(output),
            output,
            exitCode: cold ? 1 : 0,
          }),
        };
      },
    };
    const { runner: cmdRunner } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter,
      commandRunner: cmdRunner,
      now: () => new Date('2026-11-23T20:00:00Z'),
    });
    const result = await inboxRunner.tick();
    assert.equal(result.status, 'done');
    assert.equal(result.lane, 'last-resort');
    assert.ok(fs.existsSync(path.join(folders.done, 'ladder-task.md')));
    assert.ok(!fs.existsSync(path.join(folders.failed, 'ladder-task.md')));
    assert.deepEqual(lanesCalled, [
      'gemini-3.8-flash',
      'claude-sonnet-5-5',
      'gemini-4-argon',
      'last-resort',
    ]);
    assert.equal(result.attempts.filter((a) => !a.quotaError).length, 1);
    assert.equal(new Set(lanesCalled).size, lanesCalled.length);
    const now = new Date('2026-11-23T20:00:00Z');
    for (const lane of quotaLanes) assert.equal(inboxRunner.getRouter().isLaneCold(lane, now), true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('REMEMBER-COLD a lane marked cold stays cold for the next ticket including the Panda timeout fallback', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-remember-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const first = path.join(folders.queued, '01-first.md');
    const second = path.join(folders.queued, '02-second.md');
    fs.writeFileSync(first, '# First ticket\n\nFix the helper in src/utils/a.ts.', 'utf8');
    fs.writeFileSync(second, '# Second ticket\n\nFix the helper in src/utils/b.ts.', 'utf8');
    fs.utimesSync(first, new Date('2026-11-23T20:01:00Z'), new Date('2026-11-23T20:01:00Z'));
    fs.utimesSync(second, new Date('2026-11-23T20:02:00Z'), new Date('2026-11-23T20:02:00Z'));
    const lanesCalled: string[] = [];
    let ticket = 0;
    const adapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        lanesCalled.push(input.lane);
        const cold = ticket === 0 && input.lane === 'gemini-3.8-flash';
        const output = cold
          ? 'HTTP 429 quota exceeded'
          : 'Opened pull request https://github.com/Trollz1004/dream-online/pull/502';
        return {
          jobId: input.jobId ?? `job-${lanesCalled.length}`,
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(tmpRoot, `job-${lanesCalled.length}.txt`),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock remembered cold lane',
          poll: async () => ({
            done: true,
            prUrl: parsePrUrlFromOutput(output),
            output,
            exitCode: cold ? 1 : 0,
          }),
        };
      },
    };
    const { runner: cmdRunner } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter,
      commandRunner: cmdRunner,
      now: () => new Date('2026-11-23T20:00:00Z'),
      pandaPool: { 'openrouter-gemini-3.8-flash': 'gemini-3.8-flash' },
      // Panda is down, so the pick falls to the runner's own ladder walk.
      pandaFetch: (async () => {
        throw new Error('connect ECONNREFUSED 192.168.0.40:8765');
      }) as unknown as typeof fetch,
    });
    const firstResult = await inboxRunner.tick();
    ticket = 1;
    const secondResult = await inboxRunner.tick();
    assert.equal(firstResult.status, 'done');
    assert.equal(secondResult.status, 'done');
    const secondTicketLanes = lanesCalled.slice(lanesCalled.lastIndexOf('gemini-3.8-flash') + 1);
    assert.ok(secondTicketLanes.length > 0, `second ticket never dispatched: ${lanesCalled.join(', ')}`);
    assert.ok(
      !secondTicketLanes.includes('gemini-3.8-flash'),
      `dispatched cold lane: ${lanesCalled.join(', ')}`
    );
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('JevRouter with no options writes no lanes-state file', () => {
  const kitchenFile = path.join(os.homedir(), 'antigravity', '.fable-kitchen', 'lanes-state.json');
  const before = fs.existsSync(kitchenFile) ? fs.readFileSync(kitchenFile) : null;
  const router = new JevRouter();
  router.reportQuotaError('grok', 'HTTP 429 quota exceeded', new Date('2026-11-23T20:00:00Z'));
  const after = fs.existsSync(kitchenFile) ? fs.readFileSync(kitchenFile) : null;
  assert.deepEqual(after, before);
});

test('CARBON-NEON-LADDERS with both agy Claude lanes cold, code-hard and code-bulk tickets land on gemini-4-carbon and research and design-visual tickets land on gemini-4-neon; with all three Gemini 4 lanes cold they fall through to the next rung', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-carbon-neon-'));
  try {
    const now = new Date('2026-11-25T16:00:00Z');
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const coldLanes = new Set<string>(['claude-opus-5-5', 'claude-sonnet-5-5']);
    const QUOTA = 'AGY_ERROR: {"short_error":"RESOURCE_EXHAUSTED (code 429): Individual quota reached."}';
    const adapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        const isCold = coldLanes.has(input.lane);
        const output = isCold
          ? QUOTA
          : [
              'PASS · Eyes gate v1.1 · average 4.8 of 5 · lowest 4 · design-check',
              'Opened pull request https://github.com/Trollz1004/dream-online/pull/601',
            ].join('\n');
        return {
          jobId: input.jobId ?? 'carbon-neon-job',
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(tmpRoot, 'prompt.txt'),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock carbon neon ladder walk',
          poll: async () => ({
            done: true,
            prUrl: isCold ? null : parsePrUrlFromOutput(output),
            output,
            exitCode: isCold ? 1 : 0,
          }),
        };
      },
    };
    const { runner: cmdRunner } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter,
      commandRunner: cmdRunner,
      now: () => now,
      pandaPool: {
        'gemini-3.8-flash': 'openrouter-gemini-3.8-flash',
        'claude-sonnet-5-5': 'claude-sonnet-5.5',
        'claude-opus-5-5': 'claude-opus-5.5',
        'gemini-4-argon': 'openrouter-gemini-4-argon',
      },
      pandaFetch: (async () => {
        throw new Error('connect ECONNREFUSED 192.168.0.40:8765');
      }) as unknown as typeof fetch,
    });

    // Both agy Claude lanes cold
    inboxRunner.getRouter().reportQuotaError('claude-opus-5-5', 'Individual quota reached. Resets in 134h.', now);
    assert.equal(inboxRunner.getRouter().isLaneCold('claude-opus-5-5', now), true);
    assert.equal(inboxRunner.getRouter().isLaneCold('claude-sonnet-5-5', now), true);

    const dropAndRun = async (id: string, laneHeader: string) => {
      fs.writeFileSync(
        path.join(folders.queued, `${id}.md`),
        [`# Ticket ${id}`, `lane: ${laneHeader}`, '', `Work on ${id}.`].join('\n'),
        'utf8'
      );
      return inboxRunner.tick();
    };

    const hardRes = await dropAndRun('01-hard', 'code-hard');
    assert.equal(hardRes.status, 'done');
    assert.equal(hardRes.lane, 'gemini-4-carbon');

    const researchRes = await dropAndRun('02-research', 'research');
    assert.equal(researchRes.status, 'done');
    assert.equal(researchRes.lane, 'gemini-4-neon');

    const designRes = await dropAndRun('03-design', 'design-visual');
    assert.equal(designRes.status, 'done');
    assert.equal(designRes.lane, 'gemini-4-neon');

    const bulkRes = await dropAndRun('04-bulk', 'code-bulk');
    assert.equal(bulkRes.status, 'done');
    assert.equal(bulkRes.lane, 'gemini-4-carbon');

    // Now mark all three Gemini 4 lanes cold and verify fall-through to the next rung
    for (const g4 of ['gemini-4-carbon', 'gemini-4-neon', 'gemini-4-argon']) {
      coldLanes.add(g4);
      inboxRunner.getRouter().reportQuotaError(g4, 'Individual quota reached. Resets in 24h.', now);
    }

    const hardFallthrough = await dropAndRun('05-hard-fallthrough', 'code-hard');
    assert.equal(hardFallthrough.status, 'done');
    assert.equal(hardFallthrough.lane, 'gemini-3.8-flash');

    const bulkFallthrough = await dropAndRun('06-bulk-fallthrough', 'code-bulk');
    assert.equal(bulkFallthrough.status, 'done');
    assert.equal(bulkFallthrough.lane, 'gemini-3.8-flash');

    const researchFallthrough = await dropAndRun('07-research-fallthrough', 'research');
    assert.equal(researchFallthrough.status, 'done');
    assert.equal(researchFallthrough.lane, 'last-resort');

    const designFallthrough = await dropAndRun('08-design-fallthrough', 'design-visual');
    assert.equal(designFallthrough.status, 'done');
    assert.equal(designFallthrough.lane, 'last-resort');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
