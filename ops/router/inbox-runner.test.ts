import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  DEFAULT_DECISIONS_LOG_PATH,
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  parsePrUrlFromOutput,
  readDecisionLog,
} from './dream-task-router.ts';
import {
  createMockInboxCommandRunner,
  DEFAULT_INBOX_CONFIG_PATH,
  ensureInboxFolders,
  InboxRunner,
  readBaseBranchFromConfig,
} from './inbox-runner.ts';

test('Inbox format doc (ops/router/INBOX.md) and base config line', () => {
  assert.ok(fs.existsSync(DEFAULT_INBOX_CONFIG_PATH), 'ops/router/INBOX.md must exist');
  const docText = fs.readFileSync(DEFAULT_INBOX_CONFIG_PATH, 'utf8');
  assert.ok(docText.includes('%USERPROFILE%\\antigravity\\.fable-kitchen\\inbox\\'));
  assert.ok(docText.includes('queued'));
  assert.ok(docText.includes('running'));
  assert.ok(docText.includes('done'));
  assert.ok(docText.includes('failed'));
  assert.equal(readBaseBranchFromConfig(DEFAULT_INBOX_CONFIG_PATH), 'origin/ai/stack2/2026-11-04');
  assert.equal(readBaseBranchFromConfig('base: main\n'), 'main');
});

test('Inbox Item 5a: a task flows queued to done with a PR (oldest first, worktree created, cookbook rules prepended, PR comment posted, worktree removed only if pushed)', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-done-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const worktreeParentDir = path.join(tmpRoot, 'antigravity');
    const decisionsLogPath = path.join(tmpRoot, 'decisions.log');
    const folders = ensureInboxFolders(inboxDir);

    // Drop two task files with different mtimes so oldest is picked first
    const olderTaskPath = path.join(folders.queued, '01-shader-water.md');
    const newerTaskPath = path.join(folders.queued, '02-later-task.md');

    fs.writeFileSync(
      olderTaskPath,
      [
        '# Optimize WebGPU water shader',
        'repo: dream-online',
        '',
        'Optimize WebGPU ocean shader in src/shaders/water.wgsl and run unit tests.',
      ].join('\n'),
      'utf8'
    );
    const oldTime = new Date('2026-11-04T01:00:00Z');
    fs.utimesSync(olderTaskPath, oldTime, oldTime);

    fs.writeFileSync(
      newerTaskPath,
      ['# Unpushed branch task', '', 'Optimize WebGPU mesh raycast in src/shaders/mesh.wgsl.'].join(
        '\n'
      ),
      'utf8'
    );
    const newTime = new Date('2026-11-04T02:00:00Z');
    fs.utimesSync(newerTaskPath, newTime, newTime);

    const dispatchedInputs: DispatchJobInput[] = [];
    const mockAdapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        dispatchedInputs.push(input);
        const prNumber = dispatchedInputs.length === 1 ? 101 : 102;
        const output = [
          'Running tests...',
          'ℹ tests 124',
          'ℹ pass 124',
          'ℹ fail 0',
          `Opened pull request https://github.com/Trollz1004/dream-online/pull/${prNumber}`,
        ].join('\n');
        return {
          jobId: input.jobId ?? 'mock-job',
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(tmpRoot, `${input.jobId ?? 'job'}.txt`),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock agy run with PR',
          poll: async () => ({
            done: true,
            prUrl: parsePrUrlFromOutput(output),
            output,
            exitCode: 0,
          }),
        };
      },
    };

    // First task's branch is pushed -> worktree removed; second task's branch is NOT pushed -> worktree kept
    const { runner: cmdRunner, commands } = createMockInboxCommandRunner({
      ghSignedIn: true,
      branchPushed: (branch) => branch === 'ai/inbox/01-shader-water',
    });

    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath,
      adapter: mockAdapter,
      commandRunner: cmdRunner,
      now: () => new Date('2026-11-04T03:00:00Z'),
    });

    // Tick 1: picks 01-shader-water.md (oldest)
    const tick1 = await inboxRunner.tick();
    assert.equal(tick1.status, 'done');
    assert.equal(tick1.taskId, '01-shader-water');
    assert.equal(tick1.jobClass, 'engine');
    assert.equal(tick1.lane, 'gemini-4-argon');
    assert.equal(tick1.prUrl, 'https://github.com/Trollz1004/dream-online/pull/101');
    assert.equal(tick1.branchName, 'ai/inbox/01-shader-water');
    assert.equal(tick1.baseBranch, 'origin/ai/stack2/2026-11-04');
    assert.equal(
      tick1.worktreePath,
      path.join(worktreeParentDir, 'DREAM-Engine-wt-inbox-01-shader-water')
    );
    assert.equal(tick1.worktreeRemoved, true);
    assert.deepEqual(tick1.transitions, ['queued -> running', 'running -> done']);

    // Verify task file and log moved to done/
    assert.ok(fs.existsSync(path.join(folders.done, '01-shader-water.md')));
    assert.ok(fs.existsSync(path.join(folders.done, '01-shader-water.log')));
    assert.ok(!fs.existsSync(path.join(folders.queued, '01-shader-water.md')));
    assert.ok(!fs.existsSync(path.join(folders.running, '01-shader-water.md')));

    // Verify cookbook common rules were prepended to the dispatched prompt
    assert.equal(dispatchedInputs.length, 1);
    const promptSent = dispatchedInputs[0].prompt;
    assert.ok(promptSent.includes('PR only:'));
    assert.ok(promptSent.includes('No user folder names:'));
    assert.ok(promptSent.includes('No secrets:'));
    assert.ok(promptSent.includes('Proof pasted:'));
    assert.ok(promptSent.includes('Obsidian note:'));

    // Verify PR comment format and gh pr comment command
    assert.ok(tick1.prCommentBody);
    const commentLines = tick1.prCommentBody!.split('\n');
    assert.equal(commentLines[0], 'Router report: gemini-4-argon on Alienware');
    assert.ok(tick1.prCommentBody!.includes('Lane: gemini-4-argon'));
    assert.ok(tick1.prCommentBody!.includes('Job class: engine'));
    assert.ok(tick1.prCommentBody!.includes(`Decision hash: ${tick1.decisionHash}`));
    assert.ok(tick1.prCommentBody!.includes('ℹ tests 124 | ℹ pass 124 | ℹ fail 0'));

    const prCommentCmd = commands.find(
      (c) => c.command === 'gh' && c.args[0] === 'pr' && c.args[1] === 'comment'
    );
    assert.ok(prCommentCmd, 'Expected gh pr comment to be called');
    assert.equal(prCommentCmd!.args[2], 'https://github.com/Trollz1004/dream-online/pull/101');

    // Tick 2: picks 02-later-task.md whose branch was NOT pushed -> worktree is NOT removed
    const tick2 = await inboxRunner.tick();
    assert.equal(tick2.status, 'done');
    assert.equal(tick2.taskId, '02-later-task');
    assert.equal(tick2.worktreeRemoved, false);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Inbox Item 5b: a task without a PR is re-queued once then failed', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-nopr-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const worktreeParentDir = path.join(tmpRoot, 'antigravity');
    const decisionsLogPath = path.join(tmpRoot, 'decisions.log');
    const folders = ensureInboxFolders(inboxDir);

    fs.writeFileSync(
      path.join(folders.queued, 'missing-pr-task.md'),
      ['# Add inventory handler', '', 'Implement CRUD endpoints in src/api/inventory.ts.'].join(
        '\n'
      ),
      'utf8'
    );

    const seenPrompts: string[] = [];
    const mockNoPrAdapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        seenPrompts.push(input.prompt);
        return {
          jobId: input.jobId ?? `attempt-${seenPrompts.length}`,
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(tmpRoot, `prompt-${seenPrompts.length}.txt`),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock without PR URL',
          poll: async () => ({
            done: true,
            prUrl: null,
            output: `Attempt ${seenPrompts.length} finished edits without opening a PR.`,
            exitCode: 0,
          }),
        };
      },
    };

    const { runner: cmdRunner } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath,
      adapter: mockNoPrAdapter,
      commandRunner: cmdRunner,
      now: () => new Date('2026-11-04T03:10:00Z'),
    });

    const result = await inboxRunner.tick();
    assert.equal(result.status, 'failed');
    assert.equal(result.requeued, true);
    assert.equal(result.requeueCount, 1);
    assert.equal(result.attempts.length, 2);
    assert.equal(seenPrompts.length, 2);
    assert.ok(seenPrompts[1].includes('[Re-queued after failure:'));
    assert.ok(seenPrompts[1].includes('missing PR URL in lane output'));
    assert.deepEqual(result.transitions, [
      'queued -> running',
      'running -> queued (re-queue 1)',
      'queued -> running (re-queue 1)',
      'running -> failed',
    ]);

    // Task file and log are in failed/ beside each other
    assert.ok(fs.existsSync(path.join(folders.failed, 'missing-pr-task.md')));
    assert.ok(fs.existsSync(path.join(folders.failed, 'missing-pr-task.log')));
    assert.ok(!fs.existsSync(path.join(folders.queued, 'missing-pr-task.md')));
    assert.ok(!fs.existsSync(path.join(folders.running, 'missing-pr-task.md')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Inbox Item 5c: a forced lane that does not exist falls back to profiling, while a valid forced lane in lanes.json is honoured', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-forced-lane-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const worktreeParentDir = path.join(tmpRoot, 'antigravity');
    const decisionsLogPath = path.join(tmpRoot, 'decisions.log');
    const folders = ensureInboxFolders(inboxDir);

    // Task 1: invalid forced lane -> falls back to profiling (engine -> gemini-4-argon)
    const invalidTaskPath = path.join(folders.queued, '01-invalid-lane.md');
    fs.writeFileSync(
      invalidTaskPath,
      [
        '# Shader task with nonexistent forced lane',
        'lane: nonexistent-model-999',
        '',
        'Optimize WebGPU shader in src/shaders/sky.wgsl.',
      ].join('\n'),
      'utf8'
    );
    const t1Time = new Date('2026-11-04T01:00:00Z');
    fs.utimesSync(invalidTaskPath, t1Time, t1Time);

    // Task 2: valid forced lane in lanes.json (gemini-3.8-flash) -> honoured
    const validTaskPath = path.join(folders.queued, '02-valid-lane.md');
    fs.writeFileSync(
      validTaskPath,
      [
        '# Bulk task with valid forced Flash lane',
        'lane: gemini-3.8-flash',
        '',
        'Implement CRUD endpoints across src/api/profile.ts.',
      ].join('\n'),
      'utf8'
    );
    const t2Time = new Date('2026-11-04T02:00:00Z');
    fs.utimesSync(validTaskPath, t2Time, t2Time);

    const mockAdapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        const output = `Opened PR https://github.com/Trollz1004/dream-online/pull/110 on ${input.lane}`;
        return {
          jobId: input.jobId ?? 'mock-forced',
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(tmpRoot, 'prompt.txt'),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock forced lane test',
          poll: async () => ({
            done: true,
            prUrl: parsePrUrlFromOutput(output),
            output,
            exitCode: 0,
          }),
        };
      },
    };

    const { runner: cmdRunner } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath,
      adapter: mockAdapter,
      commandRunner: cmdRunner,
      now: () => new Date('2026-11-04T03:20:00Z'),
    });

    // Tick 1: nonexistent-model-999 is not in lanes.json -> falls back to profiling (engine -> gemini-4-argon)
    const res1 = await inboxRunner.tick();
    assert.equal(res1.status, 'done');
    assert.equal(res1.forcedLaneRequested, 'nonexistent-model-999');
    assert.equal(res1.forcedLaneHonoured, false);
    assert.equal(res1.jobClass, 'engine');
    assert.equal(res1.lane, 'gemini-4-argon');

    // Tick 2: gemini-3.8-flash exists in lanes.json -> honoured even though task profiles as code-bulk
    const res2 = await inboxRunner.tick();
    assert.equal(res2.status, 'done');
    assert.equal(res2.forcedLaneRequested, 'gemini-3.8-flash');
    assert.equal(res2.forcedLaneHonoured, true);
    assert.equal(res2.jobClass, 'code-bulk');
    assert.equal(res2.lane, 'gemini-3.8-flash');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Inbox Item 5d: a 429 marks the lane cold through the core and retries on the fallback lane', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-429-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const worktreeParentDir = path.join(tmpRoot, 'antigravity');
    const decisionsLogPath = path.join(tmpRoot, 'decisions.log');
    const folders = ensureInboxFolders(inboxDir);

    fs.writeFileSync(
      path.join(folders.queued, 'deadlock-fix.md'),
      [
        '# Fix concurrency deadlock',
        '',
        'Fix race condition and concurrency deadlock in distributed state machine.',
      ].join('\n'),
      'utf8'
    );

    const lanesCalled: string[] = [];
    const mock429Adapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        lanesCalled.push(input.lane);
        const isFirstClaudeAttempt = input.lane === 'claude-opus-5-5';
        const output = isFirstClaudeAttempt
          ? 'Error: HTTP 429 Too Many Requests: quota exceeded for 5 hours'
          : 'ℹ tests 124\nℹ pass 124\nOpened PR https://github.com/Trollz1004/dream-online/pull/125';
        return {
          jobId: input.jobId ?? `job-${lanesCalled.length}`,
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(tmpRoot, `job-${lanesCalled.length}.txt`),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock 429 then fallback',
          poll: async () => ({
            done: true,
            prUrl: parsePrUrlFromOutput(output),
            output,
            exitCode: isFirstClaudeAttempt ? 1 : 0,
          }),
        };
      },
    };

    const now = new Date('2026-11-04T03:30:00Z');
    const { runner: cmdRunner } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath,
      adapter: mock429Adapter,
      commandRunner: cmdRunner,
      now: () => now,
    });

    const result = await inboxRunner.tick();
    assert.equal(result.status, 'done');
    assert.equal(result.quotaFallbackTriggered, true);
    assert.deepEqual(lanesCalled, ['claude-opus-5-5', 'gemini-4-argon']);
    assert.equal(result.lane, 'gemini-4-argon');
    assert.equal(result.prUrl, 'https://github.com/Trollz1004/dream-online/pull/125');
    assert.ok(result.prCommentBody?.startsWith('Router report: gemini-4-argon on Alienware'));

    // Verify core marked claude-opus-5-5 (and shared agy-claude lane claude-sonnet-5-5) cold
    assert.equal(inboxRunner.getRouter().isLaneCold('claude-opus-5-5', now), true);
    assert.equal(inboxRunner.getRouter().isLaneCold('claude-sonnet-5-5', now), true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Inbox Item 5e: the three-failure stop halts after three consecutive failures until a human clears failed/', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-3fail-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const worktreeParentDir = path.join(tmpRoot, 'antigravity');
    const decisionsLogPath = path.join(tmpRoot, 'decisions.log');
    const folders = ensureInboxFolders(inboxDir);

    for (let i = 1; i <= 4; i += 1) {
      const p = path.join(folders.queued, `0${i}-task.md`);
      fs.writeFileSync(p, `# Task ${i}\n\nImplement endpoint ${i} in src/api/item${i}.ts.`, 'utf8');
      const t = new Date(Date.UTC(2026, 10, 4, 1, i, 0));
      fs.utimesSync(p, t, t);
    }

    let shouldSucceed = false;
    const mockAdapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        const output = shouldSucceed
          ? 'Opened PR https://github.com/Trollz1004/dream-online/pull/140'
          : 'Completed without opening a PR.';
        return {
          jobId: input.jobId ?? 'mock-3fail',
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(tmpRoot, 'prompt.txt'),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock 3-failure stop test',
          poll: async () => ({
            done: true,
            prUrl: parsePrUrlFromOutput(output),
            output,
            exitCode: 0,
          }),
        };
      },
    };

    const { runner: cmdRunner } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath,
      adapter: mockAdapter,
      commandRunner: cmdRunner,
      now: () => new Date('2026-11-04T03:40:00Z'),
    });

    const r1 = await inboxRunner.tick();
    const r2 = await inboxRunner.tick();
    const r3 = await inboxRunner.tick();
    assert.equal(r1.status, 'failed');
    assert.equal(r2.status, 'failed');
    assert.equal(r3.status, 'failed');
    assert.equal(inboxRunner.getConsecutiveFailures(), 3);

    // 4th tick must stop without picking up 04-task.md
    const r4Stopped = await inboxRunner.tick();
    assert.equal(r4Stopped.status, 'stopped-three-failures');
    assert.ok(fs.existsSync(path.join(folders.queued, '04-task.md')));

    // Human clears failed/ -> runner resumes and processes 04-task.md
    for (const f of fs.readdirSync(folders.failed)) {
      fs.rmSync(path.join(folders.failed, f), { force: true });
    }
    shouldSucceed = true;

    const r4Resumed = await inboxRunner.tick();
    assert.equal(r4Resumed.status, 'done');
    assert.equal(r4Resumed.taskId, '04-task');
    assert.ok(fs.existsSync(path.join(folders.done, '04-task.md')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Inbox Item 3 & 4: Safety gates (refuses OneDrive inbox, refuses when gh is not signed in, redacts decisions.log, and registration scripts exist)', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-safety-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const worktreeParentDir = path.join(tmpRoot, 'antigravity');
    const decisionsLogPath = path.join(tmpRoot, 'decisions.log');
    const folders = ensureInboxFolders(inboxDir);

    // 1. Refuses task file that names a path under OneDrive as its inbox
    const badOneDriveTask = path.join(folders.queued, 'onedrive-task.md');
    const fakeSecret = ['sk', 'inboxsecret99999999999'].join('-');
    fs.writeFileSync(
      badOneDriveTask,
      [
        '# Bad OneDrive inbox task',
        'inbox: %USERPROFILE%\\OneDrive\\claude-to-claude\\inbox',
        '',
        `Use token=${fakeSecret} and read from OneDrive inbox.`,
      ].join('\n'),
      'utf8'
    );

    const mockAdapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(): Promise<DispatchHandle> {
        throw new Error('Adapter must never be called for refused tasks');
      },
    };

    // First test gh not signed in: leaves task in queued/
    const { runner: unsignedGhRunner } = createMockInboxCommandRunner({ ghSignedIn: false });
    const runnerUnsigned = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath,
      adapter: mockAdapter,
      commandRunner: unsignedGhRunner,
    });
    const ghRefused = await runnerUnsigned.tick();
    assert.equal(ghRefused.status, 'refused-gh-auth');
    assert.ok(fs.existsSync(badOneDriveTask), 'Task must remain in queued/ when gh is not signed in');

    // Now test with gh signed in: refuses the task naming OneDrive as its inbox
    const { runner: signedGhRunner } = createMockInboxCommandRunner({ ghSignedIn: true });
    const runnerSigned = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath,
      adapter: mockAdapter,
      commandRunner: signedGhRunner,
      extraSecretsToRedact: [fakeSecret],
    });
    const oneDriveRefused = await runnerSigned.tick();
    assert.equal(oneDriveRefused.status, 'refused-onedrive-inbox');
    assert.ok(fs.existsSync(path.join(folders.failed, 'onedrive-task.md')));

    // Verify decisions.log has both safety records and no secret leaked
    const logged = readDecisionLog(decisionsLogPath);
    assert.equal(logged.length, 2);
    const rawLog = fs.readFileSync(decisionsLogPath, 'utf8');
    assert.ok(!rawLog.includes(fakeSecret));

    // Also verify default decisionsLogPath writes to ops/router/decisions.log with redaction
    fs.writeFileSync(
      path.join(folders.queued, 'default-log-check.md'),
      '# Default log check\n\nCheck default decisions.log.',
      'utf8'
    );
    const defaultRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      adapter: mockAdapter,
      commandRunner: unsignedGhRunner,
    });
    const defaultRefused = await defaultRunner.tick();
    assert.equal(defaultRefused.status, 'refused-gh-auth');
    assert.ok(fs.existsSync(DEFAULT_DECISIONS_LOG_PATH));

    // Verify ops/node/register-inbox-runner.ps1 and ops/node/unregister-inbox-runner.ps1 exist and configure DreamRouterInbox hidden
    const regScriptPath = path.resolve(
      path.dirname(DEFAULT_INBOX_CONFIG_PATH),
      '..',
      'node',
      'register-inbox-runner.ps1'
    );
    const unregScriptPath = path.resolve(
      path.dirname(DEFAULT_INBOX_CONFIG_PATH),
      '..',
      'node',
      'unregister-inbox-runner.ps1'
    );
    assert.ok(fs.existsSync(regScriptPath));
    assert.ok(fs.existsSync(unregScriptPath));
    const regText = fs.readFileSync(regScriptPath, 'utf8');
    assert.ok(regText.includes('DreamRouterInbox'));
    assert.ok(regText.includes('-AtLogOn'));
    assert.ok(regText.includes('-WindowStyle Hidden'));
    assert.ok(regText.includes('-Hidden'));
    assert.ok(regText.includes('[switch]$Apply'));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

function resolvePowerShell(): string | null {
  for (const exe of ['pwsh', 'powershell.exe', 'powershell']) {
    try {
      const probe = spawnSync(exe, ['-NoProfile', '-Command', 'exit 0'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      if (!probe.error && probe.status === 0) {
        return exe;
      }
    } catch {
      // ignore
    }
  }
  return null;
}

test('Inbox runner registration scripts dry-run by default without -Apply under temp HOME', (t) => {
  const psCandidate = resolvePowerShell();
  if (!psCandidate) {
    t.skip('PowerShell not available on this runner');
    return;
  }

  const isWindows = process.platform === 'win32';

  const regScriptPath = path.resolve(
    path.dirname(DEFAULT_INBOX_CONFIG_PATH),
    '..',
    'node',
    'register-inbox-runner.ps1'
  );
  const unregScriptPath = path.resolve(
    path.dirname(DEFAULT_INBOX_CONFIG_PATH),
    '..',
    'node',
    'unregister-inbox-runner.ps1'
  );

  assert.ok(fs.existsSync(regScriptPath), 'register-inbox-runner.ps1 must exist');
  assert.ok(fs.existsSync(unregScriptPath), 'unregister-inbox-runner.ps1 must exist');

  const probeTaskBefore = isWindows
    ? spawnSync(
        psCandidate,
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          "if (Get-ScheduledTask -TaskName DreamRouterInbox -ErrorAction SilentlyContinue) { 'TASK_FOUND' } else { 'TASK_NOT_FOUND' }",
        ],
        {
          encoding: 'utf8',
        }
      )
    : null;
  const taskExistedBefore = Boolean(probeTaskBefore?.stdout.includes('TASK_FOUND'));

  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-ps-dryrun-'));
  try {
    const customEnv: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: tmpHome,
      USERPROFILE: tmpHome,
      LOCALAPPDATA: path.join(tmpHome, 'AppData', 'Local'),
      APPDATA: path.join(tmpHome, 'AppData', 'Roaming'),
    };

    // 1. Run register script through powershell with no flags under temp HOME
    const regRun = spawnSync(
      psCandidate,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', regScriptPath],
      {
        env: customEnv,
        encoding: 'utf8',
      }
    );
    assert.equal(regRun.status, 0, `register script failed: ${regRun.stderr}`);
    assert.ok(regRun.stdout.includes('[DRY RUN]'), 'register output must contain [DRY RUN]');
    assert.ok(
      regRun.stdout.includes('[DRY RUN] nothing registered; pass -Apply to write'),
      'register output must contain exact dry run notice line'
    );
    assert.ok(regRun.stdout.includes('DreamRouterInbox'), 'register output must mention DreamRouterInbox');
    assert.ok(regRun.stdout.includes('%USERPROFILE%'), 'register output must show user folder as %USERPROFILE%');

    // 2. Run unregister script through powershell with no flags under temp HOME
    const unregRun = spawnSync(
      psCandidate,
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', unregScriptPath],
      {
        env: customEnv,
        encoding: 'utf8',
      }
    );
    assert.equal(unregRun.status, 0, `unregister script failed: ${unregRun.stderr}`);
    assert.ok(unregRun.stdout.includes('[DRY RUN]'), 'unregister output must contain [DRY RUN]');
    assert.ok(
      unregRun.stdout.includes('[DRY RUN] nothing unregistered; pass -Apply to write'),
      'unregister output must contain dry run notice line'
    );
    assert.ok(unregRun.stdout.includes('DreamRouterInbox'), 'unregister output must mention DreamRouterInbox');

    // 3. Assert no scheduled task was created (or pre-existing task left untouched by dry runs)
    if (isWindows) {
      const taskCheck = spawnSync(
        psCandidate,
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          "if (Get-ScheduledTask -TaskName DreamRouterInbox -ErrorAction SilentlyContinue) { 'TASK_FOUND' } else { 'TASK_NOT_FOUND' }",
        ],
        {
          env: customEnv,
          encoding: 'utf8',
        }
      );
      assert.equal(taskCheck.status, 0, `task check failed: ${taskCheck.stderr}`);
      if (taskExistedBefore) {
        assert.ok(
          taskCheck.stdout.includes('TASK_FOUND'),
          'pre-existing DreamRouterInbox task remained untouched by dry-run'
        );
      } else {
        assert.ok(
          taskCheck.stdout.includes('TASK_NOT_FOUND'),
          'Get-ScheduledTask -TaskName DreamRouterInbox must not exist'
        );
      }
    }
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});
