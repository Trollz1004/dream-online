import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { CommandExecRequest, CommandExecResult, CommandRunner } from './adapters/index.ts';
import {
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  parsePrUrlFromOutput,
} from './dream-task-router.ts';
import {
  buildCookbookCommonRulesPreamble,
  CODEMAP_BRIEF_PATH_TEMPLATE,
  createMockInboxCommandRunner,
  ensureInboxFolders,
  formatCodemapStatus,
  InboxRunner,
} from './inbox-runner.ts';

const CODE_MAP_LINE_START = 'Code map: read the code map at ';
const CODE_MAP_LINE_END = ' first, then the task.';
const FLEET_MEMORY_LINE =
  "Fleet memory: if the ai-memory tool is available, search it for the task's subject before you start. At the end store at most three lasting facts: what changed, where, what broke. Never a secret, never an env value, never anything from a vault file.";

interface Sandbox {
  tmpRoot: string;
  inboxDir: string;
  worktreeParentDir: string;
  codemapDir: string;
  codemapVaultDir: string;
  codemapScriptPath: string;
  worktreePath: string;
  decisionsLogPath: string;
}

function makeSandbox(prefix: string): Sandbox {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  const worktreeParentDir = path.join(tmpRoot, 'antigravity');
  const inboxDir = path.join(worktreeParentDir, '.fable-kitchen', 'inbox');
  const scriptDir = path.join(tmpRoot, 'script');
  fs.mkdirSync(scriptDir, { recursive: true });
  const codemapScriptPath = path.join(scriptDir, 'build-codemap.mjs');
  fs.writeFileSync(codemapScriptPath, '// stand-in; the mock runner answers the build\n', 'utf8');
  const worktreePath = path.join(worktreeParentDir, 'DREAM-Engine-wt-inbox-codemap-task');
  fs.mkdirSync(worktreePath, { recursive: true });
  return {
    tmpRoot,
    inboxDir,
    worktreeParentDir,
    codemapDir: path.join(worktreeParentDir, '.fable-kitchen', 'codemap'),
    codemapVaultDir: path.join(tmpRoot, 'Obsidian', 'Alienware', 'codemap'),
    codemapScriptPath,
    worktreePath,
    decisionsLogPath: path.join(tmpRoot, 'decisions.log'),
  };
}

function isBuild(req: CommandExecRequest, sb: Sandbox): boolean {
  return req.args[0] === sb.codemapScriptPath;
}

/** Answers git log with the base commit time and the build by writing the --out file (or failing). */
function makeRunner(
  sb: Sandbox,
  opts: { baseCommitSeconds: number; build: 'ok' | 'fail' | 'slow' }
): { runner: CommandRunner; commands: CommandExecRequest[] } {
  const mock = createMockInboxCommandRunner({
    ghSignedIn: true,
    respond: (req) => {
      if (req.command === 'git' && req.args[0] === 'log' && req.args.includes('--format=%ct')) {
        return { exitCode: 0, stdout: `${opts.baseCommitSeconds}\n`, stderr: '' };
      }
      if (isBuild(req, sb) && opts.build !== 'slow') {
        if (opts.build === 'fail') {
          return { exitCode: 2, stdout: '', stderr: 'boom' };
        }
        const outFile = req.args[req.args.indexOf('--out') + 1];
        fs.writeFileSync(outFile, `# Code map: ${req.args[2]}\n\nNEW MAP\n`, 'utf8');
        return { exitCode: 0, stdout: '', stderr: '' };
      }
      return undefined;
    },
  });
  if (opts.build !== 'slow') return mock;
  const slowRunner: CommandRunner = async (req): Promise<CommandExecResult> => {
    if (isBuild(req, sb)) {
      mock.commands.push(req);
      await new Promise((resolve) => setTimeout(resolve, 400));
      return { exitCode: 0, stdout: '', stderr: '' };
    }
    return mock.runner(req);
  };
  return { runner: slowRunner, commands: mock.commands };
}

function newRunner(sb: Sandbox, runner: CommandRunner, adapter?: DispatchAdapter, timeoutMs?: number) {
  ensureInboxFolders(sb.inboxDir);
  return new InboxRunner({
    inboxDir: sb.inboxDir,
    worktreeParentDir: sb.worktreeParentDir,
    decisionsLogPath: sb.decisionsLogPath,
    codemapDir: sb.codemapDir,
    codemapVaultDir: sb.codemapVaultDir,
    codemapScriptPath: sb.codemapScriptPath,
    codemapTimeoutMs: timeoutMs,
    commandRunner: runner,
    adapter: adapter ?? makeAdapter([]),
    // The sandbox root stands in for the user folder, so the brief path is written the same way on every platform.
    env: { ...process.env, USERPROFILE: sb.tmpRoot },
    now: () => new Date('2026-11-15T07:00:00Z'),
  });
}

function makeAdapter(seen: DispatchJobInput[]): DispatchAdapter {
  return {
    name: 'agy',
    async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
      seen.push(input);
      const output = [
        'ℹ tests 3',
        'ℹ pass 3',
        'ℹ fail 0',
        'Opened pull request https://github.com/Trollz1004/dream-online/pull/777',
      ].join('\n');
      return {
        jobId: input.jobId ?? 'mock-job',
        adapter: 'agy',
        lane: input.lane,
        harness: 'agy',
        promptPath: 'mock-prompt.txt',
        sanitizedPrompt: input.prompt,
        mode: 'headless-cli',
        httpSessionSupported: false,
        note: 'mock agy run',
        poll: async () => ({ done: true, prUrl: parsePrUrlFromOutput(output), output, exitCode: 0 }),
      };
    },
  };
}

test('code map: a stale map (older than the base commit) is rebuilt and copied to the vault', async () => {
  const sb = makeSandbox('codemap-stale-');
  try {
    fs.mkdirSync(sb.codemapDir, { recursive: true });
    const mapPath = path.join(sb.codemapDir, 'dream-online.md');
    fs.writeFileSync(mapPath, 'OLD MAP\n', 'utf8');
    const old = new Date('2020-01-01T00:00:00Z');
    fs.utimesSync(mapPath, old, old);

    const { runner, commands } = makeRunner(sb, {
      baseCommitSeconds: Math.floor(Date.parse('2026-11-15T06:00:00Z') / 1000),
      build: 'ok',
    });
    const status = await newRunner(sb, runner).ensureCodemap('dream-online', sb.worktreePath);

    assert.equal(status.state, 'rebuilt');
    assert.equal(formatCodemapStatus(status), 'code map: rebuilt');
    assert.equal(commands.filter((c) => isBuild(c, sb)).length, 1);
    const build = commands.find((c) => isBuild(c, sb))!;
    assert.equal(build.args[1], sb.worktreePath, 'built from the fresh worktree');
    assert.equal(build.args[2], 'dream-online');
    assert.match(fs.readFileSync(mapPath, 'utf8'), /NEW MAP/);
    assert.match(fs.readFileSync(path.join(sb.codemapVaultDir, 'dream-online.md'), 'utf8'), /NEW MAP/);
    assert.ok(!fs.existsSync(`${mapPath}.tmp`));
  } finally {
    fs.rmSync(sb.tmpRoot, { recursive: true, force: true });
  }
});

test('code map: a missing map is rebuilt', async () => {
  const sb = makeSandbox('codemap-missing-');
  try {
    const { runner, commands } = makeRunner(sb, { baseCommitSeconds: 1_700_000_000, build: 'ok' });
    const status = await newRunner(sb, runner).ensureCodemap('ANTIGRAVITY', sb.worktreePath);
    assert.equal(status.state, 'rebuilt');
    assert.equal(commands.filter((c) => isBuild(c, sb)).length, 1);
    assert.ok(fs.existsSync(path.join(sb.codemapDir, 'ANTIGRAVITY.md')));
    assert.ok(fs.existsSync(path.join(sb.codemapVaultDir, 'ANTIGRAVITY.md')));
  } finally {
    fs.rmSync(sb.tmpRoot, { recursive: true, force: true });
  }
});

test('code map: a fresh map (newer than the base commit) is not rebuilt', async () => {
  const sb = makeSandbox('codemap-fresh-');
  try {
    fs.mkdirSync(sb.codemapDir, { recursive: true });
    const mapPath = path.join(sb.codemapDir, 'dream-online.md');
    fs.writeFileSync(mapPath, 'CURRENT MAP\n', 'utf8');

    const { runner, commands } = makeRunner(sb, {
      baseCommitSeconds: Math.floor(Date.parse('2020-01-01T00:00:00Z') / 1000),
      build: 'ok',
    });
    const status = await newRunner(sb, runner).ensureCodemap('dream-online', sb.worktreePath);

    assert.equal(status.state, 'fresh');
    assert.equal(formatCodemapStatus(status), 'code map: fresh');
    assert.equal(commands.filter((c) => isBuild(c, sb)).length, 0, 'no build for a fresh map');
    assert.equal(fs.readFileSync(mapPath, 'utf8'), 'CURRENT MAP\n');
  } finally {
    fs.rmSync(sb.tmpRoot, { recursive: true, force: true });
  }
});

test('code map: a build that takes too long is skipped and never blocks', async () => {
  const sb = makeSandbox('codemap-slow-');
  try {
    const { runner } = makeRunner(sb, { baseCommitSeconds: 1_700_000_000, build: 'slow' });
    const started = Date.now();
    const status = await newRunner(sb, runner, undefined, 50).ensureCodemap('dream-online', sb.worktreePath);
    assert.equal(status.state, 'skipped');
    assert.match(formatCodemapStatus(status), /^code map: skipped \(build took over \d+s\)$/);
    assert.ok(Date.now() - started < 350, 'did not wait for the slow build');
  } finally {
    fs.rmSync(sb.tmpRoot, { recursive: true, force: true });
  }
});

test('code map: a failing build does not stop the task; log line 1 says skipped and why', async () => {
  const sb = makeSandbox('codemap-fail-');
  try {
    const folders = ensureInboxFolders(sb.inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'codemap-task.md'),
      ['# Tidy the README', 'repo: dream-online', '', 'Fix two typos in README.md.'].join('\n'),
      'utf8'
    );
    const seen: DispatchJobInput[] = [];
    const { runner, commands } = makeRunner(sb, { baseCommitSeconds: 1_700_000_000, build: 'fail' });
    const tick = await newRunner(sb, runner, makeAdapter(seen)).tick();

    assert.equal(commands.filter((c) => isBuild(c, sb)).length, 1, 'the build was tried');
    assert.equal(seen.length, 1, 'the lane still started');
    assert.equal(tick.status, 'done');
    const log = fs.readFileSync(path.join(folders.done, 'codemap-task.log'), 'utf8');
    const firstLine = log.split(/\r?\n/)[0];
    assert.match(firstLine, / \| code map: skipped \(build failed, exit 2\)$/);
    assert.ok(log.includes('[codemap] dream-online: code map: skipped (build failed, exit 2)'));
  } finally {
    fs.rmSync(sb.tmpRoot, { recursive: true, force: true });
  }
});

test('brief: every lane gets the code map line and the fleet memory line next to the Obsidian note line', async () => {
  const preamble = buildCookbookCommonRulesPreamble().split('\n');
  const obsidianIdx = preamble.findIndex((l) => l.startsWith('Obsidian note:'));
  assert.ok(obsidianIdx >= 0);
  assert.equal(preamble[obsidianIdx + 1], `${CODE_MAP_LINE_START}${CODEMAP_BRIEF_PATH_TEMPLATE}${CODE_MAP_LINE_END}`);
  assert.equal(preamble[obsidianIdx + 2], FLEET_MEMORY_LINE);
  assert.equal(
    CODEMAP_BRIEF_PATH_TEMPLATE,
    '%USERPROFILE%\\antigravity\\.fable-kitchen\\codemap\\<repo>.md'
  );

  // Through the runner: the brief points at the repo's own map, written as a %USERPROFILE% path.
  const sb = makeSandbox('codemap-brief-');
  try {
    const folders = ensureInboxFolders(sb.inboxDir);
    fs.writeFileSync(
      path.join(folders.queued, 'codemap-task.md'),
      ['# Tidy the README', 'repo: dream-online', '', 'Fix two typos in README.md.'].join('\n'),
      'utf8'
    );
    const seen: DispatchJobInput[] = [];
    const { runner } = makeRunner(sb, { baseCommitSeconds: 1_700_000_000, build: 'ok' });
    const tick = await newRunner(sb, runner, makeAdapter(seen)).tick();
    assert.equal(tick.status, 'done');
    const prompt = seen[0].prompt;
    const codeMapLine = prompt.split('\n').find((l) => l.startsWith(CODE_MAP_LINE_START));
    assert.ok(codeMapLine, 'code map line present');
    assert.ok(codeMapLine!.endsWith(`codemap\\dream-online.md${CODE_MAP_LINE_END}`), codeMapLine);
    assert.ok(codeMapLine!.includes('%USERPROFILE%'), 'portable path, no user folder name');
    assert.ok(!codeMapLine!.includes(sb.tmpRoot), 'no real folder path');
    assert.ok(prompt.includes(FLEET_MEMORY_LINE));
    const log = fs.readFileSync(path.join(folders.done, 'codemap-task.log'), 'utf8');
    assert.match(log.split(/\r?\n/)[0], / \| code map: rebuilt$/);
  } finally {
    fs.rmSync(sb.tmpRoot, { recursive: true, force: true });
  }
});
