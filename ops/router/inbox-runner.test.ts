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
  DEFAULT_REPO_ROOT,
  ensureInboxFolders,
  InboxRunner,
  loadRepoMap,
  parseInboxTaskFile,
  readBaseBranchFromConfig,
  resolveRepoTarget,
} from './inbox-runner.ts';

test('Inbox format doc (ops/router/INBOX.md) and base config line', () => {
  assert.ok(fs.existsSync(DEFAULT_INBOX_CONFIG_PATH), 'ops/router/INBOX.md must exist');
  const docText = fs.readFileSync(DEFAULT_INBOX_CONFIG_PATH, 'utf8');
  assert.ok(docText.includes('%USERPROFILE%\\antigravity\\.fable-kitchen\\inbox\\'));
  assert.ok(docText.includes('queued'));
  assert.ok(docText.includes('running'));
  assert.ok(docText.includes('done'));
  assert.ok(docText.includes('failed'));
  assert.equal(readBaseBranchFromConfig(DEFAULT_INBOX_CONFIG_PATH), 'origin/main');
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
    assert.equal(tick1.baseBranch, 'origin/main');
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
  const probeEnv: NodeJS.ProcessEnv = {
    ...process.env,
    XDG_CACHE_HOME: path.join(os.tmpdir(), 'dream-pwsh-probe-cache'),
  };
  for (const exe of ['pwsh', 'powershell.exe', 'powershell']) {
    try {
      const probe = spawnSync(exe, ['-NoProfile', '-Command', 'exit 0'], {
        env: probeEnv,
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

  const tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-ps-dryrun-'));
  try {
    const customEnv: NodeJS.ProcessEnv = {
      ...process.env,
      HOME: tmpHome,
      USERPROFILE: tmpHome,
      XDG_CACHE_HOME: path.join(tmpHome, '.cache'),
      LOCALAPPDATA: path.join(tmpHome, 'AppData', 'Local'),
      APPDATA: path.join(tmpHome, 'AppData', 'Roaming'),
    };

    // Snapshot the DreamRouterInbox definition (Get-ScheduledTask XML) before the dry runs; the real task
    // may be registered on this machine, so the test compares before and after instead of expecting it absent.
    const readTaskDefinition = (): string => {
      const probe = spawnSync(
        psCandidate,
        [
          '-NoProfile',
          '-ExecutionPolicy',
          'Bypass',
          '-Command',
          "$t = Get-ScheduledTask -TaskName DreamRouterInbox -ErrorAction SilentlyContinue; if ($t) { Export-ScheduledTask -InputObject $t } else { 'TASK_NOT_FOUND' }",
        ],
        { env: customEnv, encoding: 'utf8' }
      );
      assert.equal(probe.status, 0, `task definition read failed: ${probe.stderr}`);
      return probe.stdout.trim();
    };
    const taskDefinitionBefore = isWindows ? readTaskDefinition() : '';

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

    // 3. Assert the dry run did not change DreamRouterInbox: the task definition XML (or its absence) is
    // identical before and after, so the test also passes when the real task is registered on this machine.
    if (isWindows) {
      const taskDefinitionAfter = readTaskDefinition();
      assert.equal(
        taskDefinitionAfter,
        taskDefinitionBefore,
        'Get-ScheduledTask XML for DreamRouterInbox must be unchanged by the dry runs'
      );
    }
  } finally {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
});

// ---- repo selector (ops/router/repos.json) ----

function makePrAdapter(tmpRoot: string, seen: DispatchJobInput[]): DispatchAdapter {
  return {
    name: 'agy',
    async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
      seen.push(input);
      const output = 'Opened pull request https://github.com/Trollz1004/dream-online/pull/201';
      return {
        jobId: input.jobId ?? 'mock-repo-job',
        adapter: 'agy',
        lane: input.lane,
        harness: 'agy',
        promptPath: path.join(tmpRoot, 'prompt.txt'),
        sanitizedPrompt: input.prompt,
        mode: 'headless-cli',
        httpSessionSupported: false,
        note: 'mock repo selector run',
        poll: async () => ({ done: true, prUrl: parsePrUrlFromOutput(output), output, exitCode: 0 }),
      };
    },
  };
}

test('Repo map (ops/router/repos.json): dream-online is the runner root and ANTIGRAVITY comes from ANTIGRAVITY_REPO_ROOT', () => {
  const map = loadRepoMap();
  assert.deepEqual(Object.keys(map.repos).sort(), ['ANTIGRAVITY', 'dream-online']);
  const selfRoot = path.join(os.tmpdir(), 'jev-self-root');
  const fakeHome = path.join(os.tmpdir(), 'jev-fake-home');
  const siblingRoot = path.join(os.tmpdir(), 'jev-antigravity-sibling');

  assert.equal(parseInboxTaskFile('# No repo line\n\nDo a thing.', 'a.md').repo, 'dream-online');

  const own = resolveRepoTarget('dream-online', { map, env: {}, selfRoot });
  assert.ok(own.ok);
  assert.equal(own.ok && own.target.root, path.resolve(selfRoot));
  assert.equal(own.ok && own.target.worktreePrefix, 'DREAM-Engine-wt-inbox-');

  // Env variable wins
  const fromEnv = resolveRepoTarget('ANTIGRAVITY', {
    map,
    env: { ANTIGRAVITY_REPO_ROOT: siblingRoot, USERPROFILE: fakeHome },
    selfRoot,
  });
  assert.ok(fromEnv.ok);
  assert.equal(fromEnv.ok && fromEnv.target.root, path.resolve(siblingRoot));
  assert.equal(fromEnv.ok && fromEnv.target.name, 'ANTIGRAVITY');
  assert.equal(fromEnv.ok && fromEnv.target.worktreePrefix, 'ANTIGRAVITY-wt-inbox-');

  // Unset or empty env variable falls back to the default written with %USERPROFILE%
  for (const env of [{ USERPROFILE: fakeHome }, { USERPROFILE: fakeHome, ANTIGRAVITY_REPO_ROOT: '  ' }]) {
    const fallback = resolveRepoTarget('antigravity', { map, env, selfRoot });
    assert.ok(fallback.ok);
    assert.equal(
      fallback.ok && fallback.target.root,
      path.resolve(path.join(fakeHome, 'antigravity', 'ANTIGRAVITY-wt-pr335'))
    );
    assert.equal(fallback.ok && fallback.target.name, 'ANTIGRAVITY');
  }

  // repos.json itself never types a user folder name
  const rawMap = fs.readFileSync(path.join(path.dirname(DEFAULT_INBOX_CONFIG_PATH), 'repos.json'), 'utf8');
  assert.ok(rawMap.includes('%USERPROFILE%'));
  assert.ok(!/Users[\\/]/i.test(rawMap.replace(/%USERPROFILE%/g, '')));
});

test('Repo map: an unknown repo is refused with a clear message', () => {
  const map = loadRepoMap();
  for (const name of ['nope-repo', '__proto__', 'constructor', '../ANTIGRAVITY']) {
    const res = resolveRepoTarget(name, { map, env: {} });
    assert.equal(res.ok, false, `${name} must be refused`);
    assert.ok(!res.ok && res.reason.includes(`unknown repo "${name}"`));
    assert.ok(!res.ok && res.reason.includes('Known repos: ANTIGRAVITY, dream-online'));
  }
});

test('Repo selector: a task file with repo: ANTIGRAVITY gets its worktree, branch and PR commands in the ANTIGRAVITY root', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-repo-ag-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const worktreeParentDir = path.join(tmpRoot, 'antigravity');
    const agRoot = path.join(tmpRoot, 'antigravity', 'ANTIGRAVITY-sibling');
    fs.mkdirSync(agRoot, { recursive: true });
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'ag-task.md'),
      ['# Edit the ANTIGRAVITY standard', 'repo: ANTIGRAVITY', '', 'Implement a docs change in docs/standards/note.ts.'].join('\n'),
      'utf8'
    );

    const seen: DispatchJobInput[] = [];
    const { runner: cmdRunner, commands } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makePrAdapter(tmpRoot, seen),
      commandRunner: cmdRunner,
      env: { ANTIGRAVITY_REPO_ROOT: agRoot },
      now: () => new Date('2026-11-07T03:00:00Z'),
    });

    const res = await inboxRunner.tick();
    assert.equal(res.status, 'done');
    assert.equal(res.repo, 'ANTIGRAVITY');
    assert.equal(res.repoRoot, path.resolve(agRoot));
    assert.equal(res.branchName, 'ai/inbox/ag-task');
    assert.equal(res.baseBranch, 'origin/main');
    assert.equal(res.worktreePath, path.join(worktreeParentDir, 'ANTIGRAVITY-wt-inbox-ag-task'));

    // dispatch runs inside the ANTIGRAVITY worktree, with the PR base main in the prompt
    assert.equal(seen.length, 1);
    assert.equal(seen[0].cwd, res.worktreePath);
    assert.ok(seen[0].prompt.includes('open a pull request with gh against base main'));

    // every repo-scoped git/gh command ran in the ANTIGRAVITY root (gh auth status is the only runner-level call)
    const repoScoped = commands.filter(
      (c) =>
        (c.command === 'git' && ['fetch', 'worktree', 'ls-remote'].includes(c.args[0])) ||
        (c.command === 'gh' && c.args[0] === 'pr')
    );
    assert.ok(repoScoped.length >= 4, 'expected fetch, worktree add, pr comment, ls-remote, worktree remove');
    for (const c of repoScoped) {
      assert.equal(c.cwd, path.resolve(agRoot), `${c.command} ${c.args[0]} must run in the ANTIGRAVITY root`);
    }
    const add = commands.find((c) => c.command === 'git' && c.args[0] === 'worktree' && c.args[1] === 'add');
    assert.ok(add);
    assert.deepEqual(add!.args, ['worktree', 'add', '-B', 'ai/inbox/ag-task', res.worktreePath, 'origin/main']);
    const fetchIdx = commands.findIndex((c) => c.command === 'git' && c.args[0] === 'fetch');
    assert.equal(commands[fetchIdx].args.join(' '), 'fetch origin');
    assert.ok(fetchIdx < commands.indexOf(add!), 'fetch origin comes before worktree add');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Repo selector: an unknown repo is refused, never dispatched, and lands in failed/ with a clear log', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-repo-unknown-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'typo-task.md'),
      ['# Wrong repo', 'repo: dream-offline', '', 'Implement a thing in src/api/x.ts.'].join('\n'),
      'utf8'
    );
    const seen: DispatchJobInput[] = [];
    const { runner: cmdRunner, commands } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makePrAdapter(tmpRoot, seen),
      commandRunner: cmdRunner,
      env: {},
    });

    const res = await inboxRunner.tick();
    assert.equal(res.status, 'refused-unknown-repo');
    assert.ok(res.reason.includes('unknown repo "dream-offline"'));
    assert.ok(res.reason.includes('Known repos: ANTIGRAVITY, dream-online'));
    assert.equal(seen.length, 0, 'adapter must never be called');
    assert.equal(
      commands.filter((c) => c.command === 'git').length,
      0,
      'no git command may run for an unknown repo'
    );
    assert.ok(fs.existsSync(path.join(folders.failed, 'typo-task.md')));
    const log = fs.readFileSync(path.join(folders.failed, 'typo-task.log'), 'utf8');
    assert.ok(log.includes('unknown repo "dream-offline"'));
    assert.ok(!fs.existsSync(path.join(folders.running, 'typo-task.md')));
    assert.deepEqual(res.transitions, ['queued -> running', 'running -> failed']);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Repo selector: a missing ANTIGRAVITY root is refused with the portable path, not a silent git failure', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-repo-noroot-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'ag-missing.md'),
      ['# AG task', 'repo: ANTIGRAVITY', '', 'Implement a thing in src/api/y.ts.'].join('\n'),
      'utf8'
    );
    const seen: DispatchJobInput[] = [];
    const { runner: cmdRunner, commands } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makePrAdapter(tmpRoot, seen),
      commandRunner: cmdRunner,
      env: { USERPROFILE: path.join(tmpRoot, 'no-such-home') },
    });
    const res = await inboxRunner.tick();
    assert.equal(res.status, 'refused-repo-root-missing');
    assert.equal(res.repo, 'ANTIGRAVITY');
    assert.ok(res.reason.includes('does not exist'));
    assert.ok(res.reason.includes('ANTIGRAVITY_REPO_ROOT'));
    assert.equal(seen.length, 0);
    assert.equal(commands.filter((c) => c.command === 'git').length, 0);
    assert.ok(fs.existsSync(path.join(folders.failed, 'ag-missing.md')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('Repo selector: the default stays dream-online at the runner root', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-repo-default-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const worktreeParentDir = path.join(tmpRoot, 'antigravity');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'plain-task.md'),
      ['# No repo line', '', 'Implement a thing in src/api/z.ts.'].join('\n'),
      'utf8'
    );
    const seen: DispatchJobInput[] = [];
    const { runner: cmdRunner, commands } = createMockInboxCommandRunner({ ghSignedIn: true });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir,
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makePrAdapter(tmpRoot, seen),
      commandRunner: cmdRunner,
      env: { ANTIGRAVITY_REPO_ROOT: path.join(tmpRoot, 'must-not-be-used') },
    });
    const res = await inboxRunner.tick();
    assert.equal(res.status, 'done');
    assert.equal(res.repo, 'dream-online');
    assert.equal(res.repoRoot, DEFAULT_REPO_ROOT);
    assert.equal(res.baseBranch, 'origin/main');
    assert.equal(res.worktreePath, path.join(worktreeParentDir, 'DREAM-Engine-wt-inbox-plain-task'));
    const add = commands.find((c) => c.command === 'git' && c.args[0] === 'worktree' && c.args[1] === 'add');
    assert.equal(add!.cwd, DEFAULT_REPO_ROOT);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
