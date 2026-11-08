import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  AgyDispatchAdapter,
  type CommandExecRequest,
  type CommandExecResult,
  DEFAULT_RUNNER_GH_CONFIG_DIR,
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  HermesDispatchAdapter,
  loadLaneTable,
  parsePrUrlFromOutput,
  profileTask,
  readDecisionLog,
  resolveLaneEffort,
  resolveLaneHarness,
  resolveRunnerGhConfigDir,
  RUNNER_GH_CONFIG_DIR_PORTABLE,
  scrubLaneEnv,
  validateLaneTable,
} from './dream-task-router.ts';
import {
  createMockInboxCommandRunner,
  ensureInboxFolders,
  InboxRunner,
  loadRepoMap,
  runInboxRunnerWithRestart,
} from './inbox-runner.ts';

const ROUTER_DIR = path.dirname(fileURLToPath(import.meta.url));
const OWNER_PR_URL = 'https://github.com/Trollz1004/dream-online/pull/301';

// ---- 1. judge class parked, never dispatched ----

test('profileTask: README, docs, wording, rename and reference-fix jobs are mechanical, never judge', () => {
  const docJobs = [
    'Remove the mission wording line from the README and fix the stale engine references in docs',
    'Rename the run-book heading in docs/standards and fix references to the old name',
    'Docs cleanup: the README names the Fable judge lane and the FABLE-HANDOFFS-2026-11-06.md file in passing',
    'Fix broken links in the documentation and tidy the wording',
    'Reference-fix: correct every doc that still names Godot as the engine',
    'Update README wording about the judge lane',
  ];
  for (const description of docJobs) {
    const profile = profileTask(description);
    assert.equal(profile.jobClass, 'mechanical', `expected mechanical for: ${description} (got ${profile.jobClass})`);
  }
});

test('profileTask: the failed readme task body profiles as mechanical', () => {
  const body =
    'Current beats existing: fetch origin and branch from origin/main. From ops/handoffs section 6 of the ANTIGRAVITY repo (file ops/handoffs/FABLE-HANDOFFS-2026-11-06.md on that repo main, read it with gh or git): ' +
    'the README carries a mission wording line. Remove it. Then find every doc in this repo that still names Godot as the engine and correct it to the in-house engine, one PR. ' +
    'Do not touch the tribute or the title anywhere; the README image stays. Run npm test.';
  assert.equal(profileTask(body).jobClass, 'mechanical');
});

test('profileTask: judge is only for review, verdict, approve, merge and ruling jobs', () => {
  const judgeJobs = [
    'Review PR #88 and report findings',
    'Give a verdict on the wardrobe branch',
    'Approve the open PR once npm test is green',
    'Merge PR #86 after the checks pass',
    'Issue a ruling on whether the wardrobe change is correct',
    'AI lanes disagree on PR #61 architecture so Fable judge must issue final ruling',
  ];
  for (const description of judgeJobs) {
    assert.equal(profileTask(description).jobClass, 'judge', `expected judge for: ${description}`);
  }
});

test('profileTask: a bare mention of judge or fable, or a rule against merging, is not a judge job', () => {
  assert.notEqual(profileTask('Add a unit test for the fable lane resolver in src/lanes.ts').jobClass, 'judge');
  assert.notEqual(profileTask('Implement the judge lane badge in src/ui/Badge.tsx').jobClass, 'judge');
  assert.notEqual(profileTask('Add a retry helper in src/net/retry.ts. Never merge and never push to main.').jobClass, 'judge');
});

test('lanes.json: resolveLaneHarness maps fable to claude-code-signed-in and agy lanes to agy', () => {
  const table = loadLaneTable();
  assert.equal(resolveLaneHarness(table, 'fable'), 'claude-code-signed-in');
  assert.equal(resolveLaneHarness(table, 'gemini-4-argon'), 'agy');
  assert.equal(resolveLaneHarness(table, 'gemini-3.8-flash'), 'agy');
  assert.equal(resolveLaneHarness(table, 'claude-opus-5-5'), 'agy');
});

function makeAdapter(tmpRoot: string, seen: DispatchJobInput[], output: string): DispatchAdapter {
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
        note: 'mock lane run',
        poll: async () => ({ done: true, prUrl: parsePrUrlFromOutput(output), output, exitCode: 0 }),
      };
    },
  };
}

test('runner: a judge-profiled task moves to for-judge with a one-line log and never starts agy', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-judge-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    assert.ok(fs.existsSync(folders.forJudge), 'for-judge folder must be created');
    fs.writeFileSync(
      path.join(folders.queued, 'review-pr-88.md'),
      ['# Review PR 88', '', 'Review PR #88 and give a verdict on whether to approve it.'].join('\n'),
      'utf8'
    );

    const seen: DispatchJobInput[] = [];
    const { runner, commands } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makeAdapter(tmpRoot, seen, OWNER_PR_URL),
      commandRunner: runner,
      now: () => new Date('2026-11-07T03:00:00Z'),
    });

    const tick = await inboxRunner.tick();
    assert.equal(tick.status, 'parked-for-judge');
    assert.equal(tick.jobClass, 'judge');
    assert.deepEqual(tick.transitions, ['queued -> running', 'running -> for-judge']);
    assert.equal(seen.length, 0, 'agy must never be dispatched for a judge task');
    assert.ok(
      !commands.some((c) => c.command === 'git' && (c.args[0] === 'worktree' || c.args[0] === 'fetch')),
      'no worktree or fetch for a parked task'
    );
    assert.ok(fs.existsSync(path.join(folders.forJudge, 'review-pr-88.md')));
    assert.ok(!fs.existsSync(path.join(folders.running, 'review-pr-88.md')));
    assert.ok(!fs.existsSync(path.join(folders.failed, 'review-pr-88.md')));

    const logLines = fs
      .readFileSync(path.join(folders.forJudge, 'review-pr-88.log'), 'utf8')
      .split(/\r?\n/)
      .filter(Boolean);
    assert.equal(logLines.length, 1, 'the park note is one line');
    assert.match(logLines[0], /for the judge lane/);
    assert.equal(inboxRunner.getConsecutiveFailures(), 0, 'parking is not a failure');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('runner: a forced lane that resolves to the claude-code-signed-in harness (fable) is parked, not run', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-fable-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'forced-fable.md'),
      ['# Fix a typo', 'lane: fable', '', 'Fix the typo in the heading.'].join('\n'),
      'utf8'
    );
    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makeAdapter(tmpRoot, seen, OWNER_PR_URL),
      commandRunner: runner,
    });
    const tick = await inboxRunner.tick();
    assert.equal(tick.status, 'parked-for-judge');
    assert.equal(tick.lane, 'fable');
    assert.equal(tick.forcedLaneHonoured, true);
    assert.equal(seen.length, 0);
    assert.ok(fs.existsSync(path.join(folders.forJudge, 'forced-fable.md')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('runner: a docs cleanup that names Godot and a FABLE file runs on the mechanical lane instead of parking', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-readme-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'readme-wording.md'),
      [
        '# README wording and stale engine references',
        'repo: dream-online',
        '',
        'Remove the mission wording line from the README. Find every doc that still names Godot as the engine (see ops/handoffs/FABLE-HANDOFFS-2026-11-06.md) and correct it.',
      ].join('\n'),
      'utf8'
    );
    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makeAdapter(tmpRoot, seen, `Opened pull request ${OWNER_PR_URL}`),
      commandRunner: runner,
    });
    const tick = await inboxRunner.tick();
    assert.equal(tick.status, 'done');
    assert.equal(tick.jobClass, 'mechanical');
    assert.equal(tick.lane, 'gemini-3.8-flash');
    assert.equal(seen.length, 1);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ---- 2. effort per lane ----

test('lanes.json: laneSettings carry effort per lane (Argon, Opus, Sonnet high; Flash and fable none) and validate', () => {
  const table = loadLaneTable();
  assert.deepEqual(validateLaneTable(table).errors, []);
  assert.equal(resolveLaneEffort(table, 'gemini-4-argon'), 'high');
  assert.equal(resolveLaneEffort(table, 'claude-opus-5-5'), 'high');
  assert.equal(resolveLaneEffort(table, 'claude-sonnet-5-5'), 'high');
  assert.equal(resolveLaneEffort(table, 'gemini-3.8-flash'), null);
  assert.equal(resolveLaneEffort(table, 'fable'), null);
  assert.equal(resolveLaneEffort(table, 'a-lane-nobody-listed'), null);

  const bad = JSON.parse(JSON.stringify(table));
  bad.laneSettings['gemini-4-argon'] = { effort: 'extreme' };
  assert.ok(validateLaneTable(bad).errors.some((e: string) => e.includes('laneSettings.gemini-4-argon.effort')));
});

test('agy adapter: the Flash command line carries no --effort and the Argon one does (fake runner)', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-agy-effort-'));
  try {
    const calls: CommandExecRequest[] = [];
    const adapter = new AgyDispatchAdapter({
      kitchenDir: path.join(tmpRoot, '.fable-kitchen'),
      lanesPath: path.join(ROUTER_DIR, 'lanes.json'),
      runner: async (req): Promise<CommandExecResult> => {
        calls.push(req);
        return { exitCode: 0, stdout: 'ok', stderr: '' };
      },
    });
    const base = { prompt: 'do a thing', jobClass: 'mechanical' as const, harness: 'agy', cwd: tmpRoot };

    const flash = await adapter.dispatch({ ...base, jobId: 'flash-job', lane: 'gemini-3.8-flash' });
    await flash.poll();
    const argon = await adapter.dispatch({ ...base, jobId: 'argon-job', lane: 'gemini-4-argon' });
    await argon.poll();
    const opus = await adapter.dispatch({ ...base, jobId: 'opus-job', lane: 'claude-opus-5-5' });
    await opus.poll();
    const sonnet = await adapter.dispatch({ ...base, jobId: 'sonnet-job', lane: 'claude-sonnet-5-5' });
    await sonnet.poll();

    const byModel = (model: string): string[] => {
      const call = calls.find((c) => c.args[c.args.indexOf('--model') + 1] === model);
      assert.ok(call, `no agy call for ${model}`);
      return call!.args;
    };
    assert.ok(!byModel('gemini-3.8-flash').includes('--effort'), 'Flash must not get --effort');
    const argonArgs = byModel('gemini-4-argon');
    assert.equal(argonArgs[argonArgs.indexOf('--effort') + 1], 'high');
    assert.equal(byModel('claude-opus-5-5')[byModel('claude-opus-5-5').indexOf('--effort') + 1], 'high');
    assert.equal(byModel('claude-sonnet-5-5')[byModel('claude-sonnet-5-5').indexOf('--effort') + 1], 'high');
    // the rest of the command line is unchanged
    assert.ok(byModel('gemini-3.8-flash').includes('--dangerously-skip-permissions'));
    assert.ok(byModel('gemini-3.8-flash').some((a) => a.startsWith('--print=')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ---- 4/5. token hygiene ----

const TOKEN_NAMES = ['GH_TOKEN', 'GITHUB_TOKEN', 'GH_ENTERPRISE_TOKEN'];

test('scrubLaneEnv removes the three GitHub token variables case-insensitively, sets GH_CONFIG_DIR, and keeps the rest', () => {
  const source: NodeJS.ProcessEnv = {
    GH_TOKEN: 'fake-a',
    github_token: 'fake-b',
    Gh_Enterprise_Token: 'fake-c',
    gh_config_dir: 'other-lane-gh-folder',
    PATH: 'fake-path',
    KEEP_ME: '1',
  };
  const clean = scrubLaneEnv(source);
  assert.deepEqual(Object.keys(clean).sort(), ['GH_CONFIG_DIR', 'KEEP_ME', 'PATH']);
  assert.equal(clean.GH_CONFIG_DIR, DEFAULT_RUNNER_GH_CONFIG_DIR);
  assert.equal(
    RUNNER_GH_CONFIG_DIR_PORTABLE,
    '%USERPROFILE%\\antigravity\\.fable-kitchen\\gh-runner'
  );
  assert.equal(Object.keys(source).length, 6, 'the input environment is not modified');

  const fakeHome = path.join(os.tmpdir(), 'fake-home-gh');
  const fromUserProfile = scrubLaneEnv({ USERPROFILE: fakeHome, GH_TOKEN: 'fake-a' });
  assert.equal(
    fromUserProfile.GH_CONFIG_DIR,
    path.join(fakeHome, 'antigravity', '.fable-kitchen', 'gh-runner')
  );
  assert.equal(fromUserProfile.GH_TOKEN, undefined);
});

test('runner and adapters: lane environment carries GH_CONFIG_DIR and no token variables while preserving GCM env', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-env-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'env-scrub.md'),
      ['# Optimize shader', '', 'Optimize the WebGPU water shader in src/shaders/water.wgsl.'].join('\n'),
      'utf8'
    );
    const { runner, commands } = createMockInboxCommandRunner({
      respond: (req) =>
        req.command === 'agy.exe'
          ? { exitCode: 0, stdout: `Opened pull request ${OWNER_PR_URL}`, stderr: '' }
          : undefined,
    });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      commandRunner: runner,
      env: {
        PATH: 'fake-path',
        USERPROFILE: tmpRoot,
        GH_TOKEN: 'fake-a',
        github_token: 'fake-b',
        GH_ENTERPRISE_TOKEN: 'fake-c',
        GH_CONFIG_DIR: 'wrong-shared-gh-dir',
        OTHER: 'kept',
      },
    });

    const expectedGhConfigDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'gh-runner');
    assert.equal(resolveRunnerGhConfigDir({ USERPROFILE: tmpRoot }), expectedGhConfigDir);

    const tick = await inboxRunner.tick();
    assert.equal(tick.status, 'done', tick.reason);

    const agyCall = commands.find((c) => c.command === 'agy.exe');
    assert.ok(agyCall, 'the real agy adapter must run through the fake runner');
    assert.ok(commands.some((c) => c.command === 'gh'));
    for (const call of commands) {
      assert.ok(call.env, `${call.command} ${call.args[0]} must get an explicit environment`);
      const names = Object.keys(call.env!).map((k) => k.toUpperCase());
      for (const token of TOKEN_NAMES) {
        assert.ok(!names.includes(token), `${token} must not reach ${call.command} ${call.args[0]}`);
      }
      assert.equal(call.env!.GH_CONFIG_DIR, expectedGhConfigDir);
      assert.equal(call.env!.PATH, 'fake-path');
      assert.equal(call.env!.USERPROFILE, tmpRoot);
      assert.equal(call.env!.OTHER, 'kept');
    }

    // Hermes adapter also sets GH_CONFIG_DIR and strips token variables
    const hermesCalls: CommandExecRequest[] = [];
    const hermesAdapter = new HermesDispatchAdapter({
      stagingDir: path.join(tmpRoot, 'hermes-stage'),
      runner: async (req) => {
        hermesCalls.push(req);
        return { exitCode: 0, stdout: `Opened ${OWNER_PR_URL}`, stderr: '' };
      },
    });
    const hermesHandle = await hermesAdapter.dispatch({
      jobId: 'hermes-env-01',
      prompt: 'Draft launch announcement for X',
      jobClass: 'post-x',
      lane: 'grok',
      harness: 'hermes',
      env: {
        USERPROFILE: tmpRoot,
        GH_TOKEN: 'secret-tok',
        GITHUB_TOKEN: 'secret-tok-2',
      },
    });
    await hermesHandle.poll();
    assert.equal(hermesCalls.length, 2);
    for (const call of hermesCalls) {
      assert.ok(call.env);
      assert.equal(call.env!.GH_CONFIG_DIR, expectedGhConfigDir);
      assert.equal(call.env!.GH_TOKEN, undefined);
      assert.equal(call.env!.GITHUB_TOKEN, undefined);
    }
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('the runner and the agy adapter never load a .env file', () => {
  for (const file of ['inbox-runner.ts', path.join('adapters', 'agy.ts')]) {
    const text = fs.readFileSync(path.join(ROUTER_DIR, file), 'utf8');
    assert.ok(!/dotenv/i.test(text), `${file} must not use dotenv`);
    assert.ok(!/['"`]\.env['"`]/.test(text), `${file} must not open a .env file`);
    assert.ok(!/loadEnvFile/.test(text), `${file} must not call process.loadEnvFile`);
  }
});

test('repos.json names the expected GitHub owner', () => {
  assert.equal(loadRepoMap().expectedOwner, 'Trollz1004');
});

function dropEngineTask(folders: { queued: string }, id: string): void {
  fs.writeFileSync(
    path.join(folders.queued, `${id}.md`),
    ['# Optimize shader', '', 'Optimize the WebGPU water shader in src/shaders/water.wgsl.'].join('\n'),
    'utf8'
  );
}

test('owner check: a gh login that is not the expected owner stops the task with a clear log line', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-owner-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    dropEngineTask(folders, 'owner-mismatch');
    const decisionsLogPath = path.join(tmpRoot, 'decisions.log');
    const seen: DispatchJobInput[] = [];
    const { runner, commands } = createMockInboxCommandRunner({ ghLogin: 'someone-else' });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath,
      adapter: makeAdapter(tmpRoot, seen, OWNER_PR_URL),
      commandRunner: runner,
    });

    const tick = await inboxRunner.tick();
    assert.equal(tick.status, 'refused-gh-owner');
    assert.match(tick.reason, /someone-else/);
    assert.match(tick.reason, /Trollz1004/);
    assert.equal(seen.length, 0, 'no lane may start on the wrong account');
    assert.ok(fs.existsSync(path.join(folders.queued, 'owner-mismatch.md')), 'the task stays queued');

    // the first gh call is gh api user, and nothing else (no git, no pr) ran after it
    assert.deepEqual(commands.map((c) => `${c.command} ${c.args.slice(0, 2).join(' ')}`), ['gh api user']);

    const logged = readDecisionLog(decisionsLogPath);
    assert.ok(logged.some((r) => /expects Trollz1004/.test(r.reason)), 'decisions.log carries the clear line');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('owner check: when runner gh config folder has no signed-in account on start or tick, logs clear line to decisions.log and refuses tasks', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-owner2-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const seen: DispatchJobInput[] = [];
    const decisionsLogPath = path.join(tmpRoot, 'decisions.log');
    const expectedLine =
      'runner gh config empty: run gh auth login with GH_CONFIG_DIR set to %USERPROFILE%\\antigravity\\.fable-kitchen\\gh-runner';

    // 1. On start with empty queue and no signed-in account in GH_CONFIG_DIR: logs one clear line to decisions.log
    const failing = createMockInboxCommandRunner({ ghSignedIn: false });
    const runnerOnStart = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath,
      adapter: makeAdapter(tmpRoot, seen, OWNER_PR_URL),
      commandRunner: failing.runner,
      env: { USERPROFILE: tmpRoot },
    });
    const startTick = await runnerOnStart.tick();
    assert.equal(startTick.status, 'refused-gh-auth');
    assert.equal(startTick.reason, expectedLine);
    assert.equal(readDecisionLog(decisionsLogPath).length, 1);
    assert.equal(readDecisionLog(decisionsLogPath)[0].reason, expectedLine);

    // 2. With a task in queued/ and no signed-in account: refuses task, leaves it in queued/, logs the clear line
    dropEngineTask(folders, 'owner-ok');
    const refused = await runnerOnStart.tick();
    assert.equal(refused.status, 'refused-gh-auth');
    assert.equal(refused.reason, expectedLine);
    assert.ok(fs.existsSync(path.join(folders.queued, 'owner-ok.md')), 'task stays in queued/');
    assert.equal(seen.length, 0);
    assert.equal(readDecisionLog(decisionsLogPath).length, 2);
    assert.equal(readDecisionLog(decisionsLogPath)[1].reason, expectedLine);

    // 3. Matching login (any case) proceeds
    const matching = createMockInboxCommandRunner({ ghLogin: 'trollz1004' });
    const ok = await new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions-ok.log'),
      adapter: makeAdapter(tmpRoot, seen, `Opened pull request ${OWNER_PR_URL}`),
      commandRunner: matching.runner,
      env: { USERPROFILE: tmpRoot },
    }).tick();
    assert.equal(ok.status, 'done');
    assert.equal(seen.length, 1);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

// ---- 5. the runner opens the PR when the lane pushed but did not ----

function runPrScenario(options: {
  branchPushed: boolean;
  prView?: CommandExecResult;
  prCreate?: CommandExecResult;
  laneOutput: string;
}): Promise<{
  tick: Awaited<ReturnType<InboxRunner['tick']>>;
  commands: CommandExecRequest[];
  folders: ReturnType<typeof ensureInboxFolders>;
  cleanup: () => void;
}> {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-pr-'));
  const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
  const folders = ensureInboxFolders(inboxDir);
  dropEngineTask(folders, 'lane-gh-trouble');
  const { runner, commands } = createMockInboxCommandRunner({
    branchPushed: options.branchPushed,
    respond: (req) => {
      if (req.command === 'gh' && req.args[0] === 'pr' && req.args[1] === 'view') {
        return options.prView ?? { exitCode: 1, stdout: '', stderr: 'no pull requests found for branch' };
      }
      if (req.command === 'gh' && req.args[0] === 'pr' && req.args[1] === 'create') {
        return options.prCreate ?? { exitCode: 0, stdout: `${OWNER_PR_URL}\n`, stderr: '' };
      }
      return undefined;
    },
  });
  const inboxRunner = new InboxRunner({
    inboxDir,
    worktreeParentDir: path.join(tmpRoot, 'antigravity'),
    decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
    adapter: makeAdapter(tmpRoot, [], options.laneOutput),
    commandRunner: runner,
  });
  return inboxRunner.tick().then((tick) => ({
    tick,
    commands,
    folders,
    cleanup: () => fs.rmSync(tmpRoot, { recursive: true, force: true }),
  }));
}

test('PR opening: a lane that pushed but hit gh trouble still finishes, the runner opens the PR from the lane report', async () => {
  const laneOutput = [
    'gh: error connecting to api.github.com',
    'PR title: shader: tune water caustics',
    'ℹ tests 10',
    'ℹ pass 10',
    'ℹ fail 0',
    'Branch pushed, but gh pr create failed.',
  ].join('\n');
  const run = await runPrScenario({ branchPushed: true, laneOutput });
  try {
    assert.equal(run.tick.status, 'done', run.tick.reason);
    assert.equal(run.tick.prUrl, OWNER_PR_URL);
    assert.ok(fs.existsSync(path.join(run.folders.done, 'lane-gh-trouble.md')));
    assert.ok(!fs.existsSync(path.join(run.folders.failed, 'lane-gh-trouble.md')));

    const create = run.commands.find((c) => c.command === 'gh' && c.args[0] === 'pr' && c.args[1] === 'create');
    assert.ok(create, 'the runner must run gh pr create itself');
    const arg = (flag: string): string => create!.args[create!.args.indexOf(flag) + 1];
    assert.equal(arg('--head'), 'ai/inbox/lane-gh-trouble');
    assert.equal(arg('--base'), 'main');
    assert.equal(arg('--title'), 'shader: tune water caustics');
    assert.match(arg('--body'), /pushed ai\/inbox\/lane-gh-trouble but did not open a pull request/);
    assert.match(arg('--body'), /ℹ pass 10/);
    // the PR comment still goes on the PR the runner opened
    const comment = run.commands.find((c) => c.command === 'gh' && c.args[1] === 'comment');
    assert.equal(comment?.args[2], OWNER_PR_URL);
  } finally {
    run.cleanup();
  }
});

test('PR opening: an already open PR for the branch is reused and no second PR is created', async () => {
  const run = await runPrScenario({
    branchPushed: true,
    prView: { exitCode: 0, stdout: `${OWNER_PR_URL}\n`, stderr: '' },
    laneOutput: 'Pushed the branch.',
  });
  try {
    assert.equal(run.tick.status, 'done', run.tick.reason);
    assert.equal(run.tick.prUrl, OWNER_PR_URL);
    assert.ok(!run.commands.some((c) => c.command === 'gh' && c.args[1] === 'create'));
  } finally {
    run.cleanup();
  }
});

test('PR opening: nothing pushed means no PR is opened and the task fails as before', async () => {
  const run = await runPrScenario({ branchPushed: false, laneOutput: 'I did some thinking but pushed nothing.' });
  try {
    assert.equal(run.tick.status, 'failed');
    assert.ok(!run.commands.some((c) => c.command === 'gh' && c.args[0] === 'pr' && c.args[1] === 'create'));
  } finally {
    run.cleanup();
  }
});

test('PR opening: when gh pr create itself fails the task fails with a clear log line', async () => {
  const run = await runPrScenario({
    branchPushed: true,
    prCreate: { exitCode: 1, stdout: '', stderr: 'GraphQL: Resource not accessible by personal access token' },
    laneOutput: 'Pushed the branch.',
  });
  try {
    assert.equal(run.tick.status, 'failed');
    const log = fs.readFileSync(path.join(run.folders.failed, 'lane-gh-trouble.log'), 'utf8');
    assert.match(log, /runner could not open the PR with gh: GraphQL: Resource not accessible/);
  } finally {
    run.cleanup();
  }
});

test('INBOX.md documents the for-judge folder, the effort rule, the owner check, the dedicated GH_CONFIG_DIR folder and the runner-opened PR', () => {
  const doc = fs.readFileSync(path.join(ROUTER_DIR, 'INBOX.md'), 'utf8');
  for (const needle of [
    'for-judge',
    'laneSettings',
    '--effort',
    'expectedOwner',
    'gh pr create',
    'GH_TOKEN',
    'GH_CONFIG_DIR',
    '%USERPROFILE%\\antigravity\\.fable-kitchen\\gh-runner',
    'gh auth login',
    'base: origin/main',
    'repos.json',
    'lane process missing',
    'Fable:',
  ]) {
    assert.ok(doc.includes(needle), `INBOX.md must mention ${needle}`);
  }
});

test('restart on exit: supervising loop brings the runner back after an exit or unhandled error, and register-inbox-runner.ps1 carries the restart loop', async () => {
  const events: string[] = [];
  let runs = 0;

  await runInboxRunnerWithRestart({
    maxRestarts: 2,
    restartDelayMs: 1,
    sleep: async (ms) => {
      events.push(`sleep:${ms}`);
    },
    onRestart: (err, attempt) => {
      events.push(`restart:${attempt}:${err instanceof Error ? err.message : String(err)}`);
    },
    runOnce: async () => {
      runs += 1;
      events.push(`run:${runs}`);
      if (runs === 1) {
        throw new Error('simulated crash 1');
      }
      if (runs === 2) {
        return { exitCode: 1 };
      }
      return { exitCode: 0, stop: true };
    },
  });

  assert.equal(runs, 3, 'runner must be restarted after crash and after unexpected exit');
  assert.deepEqual(events, [
    'run:1',
    'restart:1:simulated crash 1',
    'sleep:1',
    'run:2',
    'restart:2:runner exited with code 1',
    'sleep:1',
    'run:3',
  ]);

  const regScriptPath = path.resolve(ROUTER_DIR, '..', 'node', 'register-inbox-runner.ps1');
  const regText = fs.readFileSync(regScriptPath, 'utf8');
  assert.match(regText, /while\s*\(\s*`?\$true\s*\)/i, 'register-inbox-runner.ps1 action must loop to restart on exit');
  assert.match(regText, /Start-Sleep/i, 'register-inbox-runner.ps1 restart loop must sleep briefly before restarting');
});

// ---- 6. explicit lane header wins; Fable-class signals from title only; lane liveness ----

const TRIGGER_WORDS_BODY = [
  'When the hit lands, review the decision and check the outcome.',
  'Issue a final ruling and verdict after we approve and merge the branch.',
  'Even if AI lanes disagree or ask a supreme judge to arbitrate, check the land and decision.',
].join('\n');

test('explicit lane: a body full of trigger words with lane: engine runs on Argon and never parks', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-explicit-engine-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const taskContent = [
      '# Update combat camera offset',
      'lane: engine',
      '',
      TRIGGER_WORDS_BODY,
    ].join('\n');
    fs.writeFileSync(path.join(folders.queued, 'engine-with-triggers.md'), taskContent, 'utf8');

    assert.equal(profileTask(taskContent).jobClass, 'engine');

    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makeAdapter(tmpRoot, seen, `Opened pull request ${OWNER_PR_URL}`),
      commandRunner: runner,
    });

    const tick = await inboxRunner.tick();
    assert.equal(tick.status, 'done', tick.reason);
    assert.equal(tick.jobClass, 'engine');
    assert.equal(tick.lane, 'gemini-4-argon');
    assert.equal(tick.forcedLaneRequested, 'engine');
    assert.equal(tick.forcedLaneHonoured, true);
    assert.equal(seen.length, 1);
    assert.equal(seen[0].lane, 'gemini-4-argon');
    assert.equal(seen[0].jobClass, 'engine');
    assert.ok(fs.existsSync(path.join(folders.done, 'engine-with-triggers.md')));
    assert.ok(!fs.existsSync(path.join(folders.forJudge, 'engine-with-triggers.md')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('explicit lane: all six executor lane headers (engine, mechanical, code-bulk, code-hard, design-visual, research) win over trigger words and only lane: fable parks', async () => {
  const expectedByExecutorLane: Array<{
    headerLane: 'engine' | 'mechanical' | 'code-bulk' | 'code-hard' | 'design-visual' | 'research';
    expectedModel: string;
    output: string;
  }> = [
    { headerLane: 'engine', expectedModel: 'gemini-4-argon', output: `Opened pull request ${OWNER_PR_URL}` },
    { headerLane: 'mechanical', expectedModel: 'gemini-3.8-flash', output: `Opened pull request ${OWNER_PR_URL}` },
    { headerLane: 'code-bulk', expectedModel: 'claude-sonnet-5-5', output: `Opened pull request ${OWNER_PR_URL}` },
    { headerLane: 'code-hard', expectedModel: 'claude-opus-5-5', output: `Opened pull request ${OWNER_PR_URL}` },
    {
      headerLane: 'design-visual',
      expectedModel: 'claude-opus-5-5',
      output: `PASS · Eyes gate v1\nOpened pull request ${OWNER_PR_URL}`,
    },
    { headerLane: 'research', expectedModel: 'claude-opus-5-5', output: `Opened pull request ${OWNER_PR_URL}` },
  ];

  for (const item of expectedByExecutorLane) {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), `jev-inbox-exec-${item.headerLane}-`));
    try {
      const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
      const folders = ensureInboxFolders(inboxDir);
      fs.writeFileSync(
        path.join(folders.queued, `${item.headerLane}-task.md`),
        [`# Task for ${item.headerLane}`, `lane: ${item.headerLane}`, '', TRIGGER_WORDS_BODY].join('\n'),
        'utf8'
      );
      const seen: DispatchJobInput[] = [];
      const { runner } = createMockInboxCommandRunner();
      const inboxRunner = new InboxRunner({
        inboxDir,
        worktreeParentDir: path.join(tmpRoot, 'antigravity'),
        decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
        adapter: makeAdapter(tmpRoot, seen, item.output),
        commandRunner: runner,
      });
      const tick = await inboxRunner.tick();
      assert.equal(tick.status, 'done', `${item.headerLane}: ${tick.reason}`);
      assert.equal(tick.jobClass, item.headerLane);
      assert.equal(tick.lane, item.expectedModel);
      assert.equal(tick.forcedLaneHonoured, true);
      assert.equal(seen.length, 1);
    } finally {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    }
  }
});

test('title-only Fable signals: a title that starts with Fable: with no lane header parks in for-judge', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-fable-title-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const taskContent = [
      '# Fable: check the wardrobe combat camera offset',
      '',
      'Inspect src/engine/camera.ts and record notes.',
    ].join('\n');
    fs.writeFileSync(path.join(folders.queued, 'fable-title.md'), taskContent, 'utf8');

    assert.equal(profileTask(taskContent).jobClass, 'judge');

    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makeAdapter(tmpRoot, seen, `Opened pull request ${OWNER_PR_URL}`),
      commandRunner: runner,
    });

    const tick = await inboxRunner.tick();
    assert.equal(tick.status, 'parked-for-judge');
    assert.equal(tick.jobClass, 'judge');
    assert.equal(tick.lane, 'fable');
    assert.equal(seen.length, 0);
    assert.ok(fs.existsSync(path.join(folders.forJudge, 'fable-title.md')));
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('title-only Fable signals: a body with the trigger words, no lane header, and a plain title runs as profiled by the other signals', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-plain-title-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const engineBodyWithTriggers = [
      '# Tune water caustics mesh in Sunken Bastion',
      '',
      TRIGGER_WORDS_BODY,
      'Update the WebGPU shader in src/shaders/water.wgsl.',
    ].join('\n');
    const mechanicalBodyWithTriggers = [
      '# Clean up configuration comments',
      '',
      TRIGGER_WORDS_BODY,
      'Fix typo and sort imports in the config header.',
    ].join('\n');

    assert.equal(profileTask(engineBodyWithTriggers).jobClass, 'engine');
    assert.equal(profileTask(mechanicalBodyWithTriggers).jobClass, 'mechanical');

    const t1 = path.join(folders.queued, '01-plain-engine.md');
    const t2 = path.join(folders.queued, '02-plain-mechanical.md');
    fs.writeFileSync(t1, engineBodyWithTriggers, 'utf8');
    fs.utimesSync(t1, new Date('2026-11-07T01:00:00Z'), new Date('2026-11-07T01:00:00Z'));
    fs.writeFileSync(t2, mechanicalBodyWithTriggers, 'utf8');
    fs.utimesSync(t2, new Date('2026-11-07T02:00:00Z'), new Date('2026-11-07T02:00:00Z'));

    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner();
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makeAdapter(tmpRoot, seen, `Opened pull request ${OWNER_PR_URL}`),
      commandRunner: runner,
    });

    const tick1 = await inboxRunner.tick();
    assert.equal(tick1.status, 'done', tick1.reason);
    assert.equal(tick1.jobClass, 'engine');
    assert.equal(tick1.lane, 'gemini-4-argon');

    const tick2 = await inboxRunner.tick();
    assert.equal(tick2.status, 'done', tick2.reason);
    assert.equal(tick2.jobClass, 'mechanical');
    assert.equal(tick2.lane, 'gemini-3.8-flash');
    assert.equal(seen.length, 2);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('lane liveness check: a task in running/ for >10m with no agy child process is marked failed with reason "lane process missing" and re-queued once', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-liveness-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const now = new Date('2026-11-07T06:00:00Z');
    const runningTaskPath = path.join(folders.running, 'stuck-lane.md');
    fs.writeFileSync(
      runningTaskPath,
      ['# Optimize water shader', 'lane: engine', '', 'Optimize src/shaders/water.wgsl.'].join('\n'),
      'utf8'
    );

    // 1. Sitting in running/ for 5 minutes (<= 10m) stays busy
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
    fs.utimesSync(runningTaskPath, fiveMinAgo, fiveMinAgo);

    const seen: DispatchJobInput[] = [];
    let agyAlive = false;
    const { runner } = createMockInboxCommandRunner({
      agyChildProcessRunning: () => agyAlive,
    });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makeAdapter(tmpRoot, seen, `Opened pull request ${OWNER_PR_URL}`),
      commandRunner: runner,
      now: () => now,
    });

    const busyShort = await inboxRunner.tick();
    assert.equal(busyShort.status, 'busy');
    assert.equal(seen.length, 0);

    // 2. Sitting in running/ for 11 minutes (> 10m) WITH a live agy child process stays busy
    const elevenMinAgo = new Date(now.getTime() - 11 * 60 * 1000);
    fs.utimesSync(runningTaskPath, elevenMinAgo, elevenMinAgo);
    agyAlive = true;
    const busyLiveChild = await inboxRunner.tick();
    assert.equal(busyLiveChild.status, 'busy');
    assert.equal(seen.length, 0);

    // 3. Sitting in running/ for 11 minutes (> 10m) with NO agy child process:
    //    marks it failed with reason 'lane process missing' and re-queues it once
    agyAlive = false;
    const recovered = await inboxRunner.tick();
    assert.equal(recovered.status, 'done', recovered.reason);
    assert.equal(recovered.requeued, true);
    assert.equal(recovered.requeueCount, 1);
    assert.equal(recovered.attempts.length, 2);
    assert.equal(recovered.attempts[0].passedJudge, false);
    assert.equal(recovered.attempts[0].failureReason, 'lane process missing');
    assert.equal(recovered.attempts[1].passedJudge, true);
    assert.ok(recovered.attempts[1].prompt.includes('[Re-queued after failure: lane process missing]'));
    assert.deepEqual(recovered.transitions, [
      'running -> queued (re-queue 1)',
      'queued -> running (re-queue 1)',
      'running -> done',
    ]);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

test('lane liveness check: if the re-queued task fails again after lane process missing, it moves to failed/ and is not re-queued a second time', async () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-inbox-liveness-fail-'));
  try {
    const inboxDir = path.join(tmpRoot, 'antigravity', '.fable-kitchen', 'inbox');
    const folders = ensureInboxFolders(inboxDir);
    const now = new Date('2026-11-07T07:00:00Z');
    const runningTaskPath = path.join(folders.running, 'stuck-twice.md');
    fs.writeFileSync(
      runningTaskPath,
      ['# Optimize water shader', 'lane: engine', '', 'Optimize src/shaders/water.wgsl.'].join('\n'),
      'utf8'
    );
    const elevenMinAgo = new Date(now.getTime() - 11 * 60 * 1000);
    fs.utimesSync(runningTaskPath, elevenMinAgo, elevenMinAgo);

    const seen: DispatchJobInput[] = [];
    const { runner } = createMockInboxCommandRunner({
      agyChildProcessRunning: false,
      branchPushed: false,
    });
    const inboxRunner = new InboxRunner({
      inboxDir,
      worktreeParentDir: path.join(tmpRoot, 'antigravity'),
      decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
      adapter: makeAdapter(tmpRoot, seen, 'lane exited without opening a PR'),
      commandRunner: runner,
      now: () => now,
    });

    const failedTick = await inboxRunner.tick();
    assert.equal(failedTick.status, 'failed');
    assert.equal(failedTick.requeued, true);
    assert.equal(failedTick.requeueCount, 1);
    assert.equal(seen.length, 1, 'dispatched only once on the single re-queue');
    assert.equal(failedTick.attempts[0].failureReason, 'lane process missing');
    assert.match(failedTick.reason, /lane process missing/);
    assert.ok(fs.existsSync(path.join(folders.failed, 'stuck-twice.md')));
    const failedLog = fs.readFileSync(path.join(folders.failed, 'stuck-twice.log'), 'utf8');
    assert.match(failedLog, /lane process missing/);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});
