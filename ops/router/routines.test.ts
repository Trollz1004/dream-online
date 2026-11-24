import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  parseRoutine,
  ROUTINE_MIN_INTERVAL_MS,
  RoutineScheduler,
  routinesStatePath,
} from './routines.ts';
import { createMockInboxCommandRunner, ensureInboxFolders, InboxRunner } from './inbox-runner.ts';
import {
  type DispatchAdapter,
  type DispatchHandle,
  type DispatchJobInput,
  parsePrUrlFromOutput,
} from './dream-task-router.ts';

interface Kitchen {
  root: string;
  kitchenDir: string;
  inboxDir: string;
  routinesDir: string;
  queued: string;
  running: string;
}

function makeKitchen(): Kitchen {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'routines-test-'));
  const kitchenDir = path.join(root, 'antigravity', '.fable-kitchen');
  const inboxDir = path.join(kitchenDir, 'inbox');
  const folders = ensureInboxFolders(inboxDir);
  const routinesDir = path.join(kitchenDir, 'orders', 'routines');
  fs.mkdirSync(routinesDir, { recursive: true });
  return { root, kitchenDir, inboxDir, routinesDir, queued: folders.queued, running: folders.running };
}

function makeScheduler(kitchen: Kitchen, clock: { now: Date }, logs: string[]): RoutineScheduler {
  return new RoutineScheduler({
    kitchenDir: kitchen.kitchenDir,
    queuedDir: kitchen.queued,
    runningDir: kitchen.running,
    now: () => clock.now,
    log: (line) => logs.push(line),
  });
}

function writeRoutine(kitchen: Kitchen, name: string, lines: string[]): void {
  fs.writeFileSync(path.join(kitchen.routinesDir, name), lines.join('\n'), 'utf8');
}

const SCOUT = [
  '# Nightly scout',
  'repo: dream-online',
  'every: 6h',
  '',
  'Read the code map and report one stale doc.',
];

test('routine due: copies into queued with date and time in the name and the every line removed, and records the run', () => {
  const kitchen = makeKitchen();
  try {
    writeRoutine(kitchen, 'scout.md', SCOUT);
    const clock = { now: new Date(2026, 10, 24, 7, 0, 0) };
    const logs: string[] = [];
    const queuedNames = makeScheduler(kitchen, clock, logs).runDue();

    assert.deepEqual(queuedNames, ['scout-20261124-0700.md']);
    const copy = fs.readFileSync(path.join(kitchen.queued, 'scout-20261124-0700.md'), 'utf8');
    assert.ok(!/^\s*every\s*:/im.test(copy), 'every line must be gone from the copy');
    assert.ok(copy.includes('# Nightly scout'));
    assert.ok(copy.includes('repo: dream-online'));
    assert.ok(copy.includes('Read the code map and report one stale doc.'));
    // The routine file itself is untouched.
    assert.ok(fs.readFileSync(path.join(kitchen.routinesDir, 'scout.md'), 'utf8').includes('every: 6h'));
    // The state file is in the kitchen folder, never in the repo.
    const statePath = routinesStatePath(kitchen.kitchenDir);
    assert.equal(path.dirname(statePath), kitchen.kitchenDir);
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    assert.ok(state['scout.md'], 'last run is stored per routine');
    assert.deepEqual(logs, []);
  } finally {
    fs.rmSync(kitchen.root, { recursive: true, force: true });
  }
});

test('routine not due: nothing is copied until the interval has passed', () => {
  const kitchen = makeKitchen();
  try {
    writeRoutine(kitchen, 'scout.md', SCOUT);
    const clock = { now: new Date(2026, 10, 24, 7, 0, 0) };
    const scheduler = makeScheduler(kitchen, clock, []);
    assert.equal(scheduler.runDue().length, 1);
    fs.rmSync(path.join(kitchen.queued, 'scout-20261124-0700.md'));

    clock.now = new Date(2026, 10, 24, 12, 59, 0);
    assert.deepEqual(scheduler.runDue(), [], 'five hours fifty-nine is not due for every 6h');

    clock.now = new Date(2026, 10, 24, 13, 0, 0);
    assert.deepEqual(scheduler.runDue(), ['scout-20261124-1300.md']);
  } finally {
    fs.rmSync(kitchen.root, { recursive: true, force: true });
  }
});

test('daily routine runs once per day after its local time', () => {
  const kitchen = makeKitchen();
  try {
    writeRoutine(kitchen, 'morning.md', ['# Morning pass', 'daily: 07:30', '', 'Check the board.']);
    const clock = { now: new Date(2026, 10, 24, 7, 29, 0) };
    const scheduler = makeScheduler(kitchen, clock, []);
    assert.deepEqual(scheduler.runDue(), [], 'before 07:30 it is not due');

    clock.now = new Date(2026, 10, 24, 7, 31, 0);
    assert.deepEqual(scheduler.runDue(), ['morning-20261124-0731.md']);
    fs.rmSync(path.join(kitchen.queued, 'morning-20261124-0731.md'));

    clock.now = new Date(2026, 10, 24, 15, 0, 0);
    assert.deepEqual(scheduler.runDue(), [], 'already ran today');

    clock.now = new Date(2026, 10, 25, 7, 30, 0);
    assert.deepEqual(scheduler.runDue(), ['morning-20261125-0730.md']);
  } finally {
    fs.rmSync(kitchen.root, { recursive: true, force: true });
  }
});

test('routine already queued or running: no second copy and no state change', () => {
  const kitchen = makeKitchen();
  try {
    writeRoutine(kitchen, 'scout.md', SCOUT);
    writeRoutine(kitchen, 'scout-extra.md', [
      '# Other routine with a similar name',
      'every: 6h',
      '',
      'Different job.',
    ]);
    const clock = { now: new Date(2026, 10, 24, 7, 0, 0) };
    // An older copy of scout is still queued; a copy of a differently named routine does not count.
    fs.writeFileSync(path.join(kitchen.queued, 'scout-20261123-2300.md'), '# old copy\n', 'utf8');
    const first = makeScheduler(kitchen, clock, []).runDue();
    assert.deepEqual(first, ['scout-extra-20261124-0700.md'], 'only the routine with no copy waiting is queued');
    assert.ok(!fs.existsSync(path.join(kitchen.queued, 'scout-20261124-0700.md')));

    // Move that copy to running: still counts as present.
    fs.renameSync(
      path.join(kitchen.queued, 'scout-20261123-2300.md'),
      path.join(kitchen.running, 'scout-20261123-2300.md')
    );
    clock.now = new Date(2026, 10, 24, 8, 0, 0);
    assert.deepEqual(makeScheduler(kitchen, clock, []).runDue(), []);

    // Once the copy is gone the routine is still due, because the blocked pass did not count as a run.
    fs.rmSync(path.join(kitchen.running, 'scout-20261123-2300.md'));
    assert.deepEqual(makeScheduler(kitchen, clock, []).runDue(), ['scout-20261124-0800.md']);
  } finally {
    fs.rmSync(kitchen.root, { recursive: true, force: true });
  }
});

test('malformed routine is skipped with one log line, never throws, and good routines still run', () => {
  const kitchen = makeKitchen();
  try {
    writeRoutine(kitchen, 'bad-unit.md', ['# Bad unit', 'every: soon', '', 'x']);
    writeRoutine(kitchen, 'bad-zero.md', ['# Zero', 'every: 0h', '', 'x']);
    writeRoutine(kitchen, 'bad-time.md', ['# Bad time', 'daily: 25:99', '', 'x']);
    writeRoutine(kitchen, 'no-header.md', ['# No schedule line', '', 'Only a body.']);
    writeRoutine(kitchen, 'both.md', ['# Both', 'every: 2h', 'daily: 07:30', '', 'x']);
    fs.writeFileSync(path.join(kitchen.routinesDir, 'empty.md'), '', 'utf8');
    writeRoutine(kitchen, 'good.md', SCOUT);
    fs.writeFileSync(path.join(kitchen.routinesDir, 'notes.txt'), 'not a routine', 'utf8');

    const clock = { now: new Date(2026, 10, 24, 7, 0, 0) };
    const logs: string[] = [];
    const scheduler = makeScheduler(kitchen, clock, logs);
    let queuedNames: string[] = [];
    assert.doesNotThrow(() => {
      queuedNames = scheduler.runDue();
    });
    assert.deepEqual(queuedNames, ['good-20261124-0700.md']);
    assert.equal(logs.length, 6, 'one log line per malformed routine');
    for (const name of ['bad-unit.md', 'bad-zero.md', 'bad-time.md', 'no-header.md', 'both.md', 'empty.md']) {
      assert.equal(logs.filter((line) => line.includes(name)).length, 1, `${name} is logged once`);
    }

    // Later ticks do not repeat the same line while the file is unchanged.
    clock.now = new Date(2026, 10, 24, 7, 1, 0);
    scheduler.runDue();
    assert.equal(logs.length, 6);

    assert.equal(parseRoutine('# t\nevery: 90s\n\nbody').ok, false);
    assert.equal(parseRoutine('# t\nevery: 90m\n\nbody').ok, true);
  } finally {
    fs.rmSync(kitchen.root, { recursive: true, force: true });
  }
});

test('state survives a restart: a new scheduler on the same kitchen still knows the last run', () => {
  const kitchen = makeKitchen();
  try {
    writeRoutine(kitchen, 'scout.md', SCOUT);
    const clock = { now: new Date(2026, 10, 24, 7, 0, 0) };
    assert.equal(makeScheduler(kitchen, clock, []).runDue().length, 1);
    fs.rmSync(path.join(kitchen.queued, 'scout-20261124-0700.md'));

    // "Restart": a brand new scheduler object, same folders.
    clock.now = new Date(2026, 10, 24, 9, 0, 0);
    assert.deepEqual(makeScheduler(kitchen, clock, []).runDue(), [], 'two hours later it is not due after a restart');

    clock.now = new Date(2026, 10, 24, 13, 0, 0);
    assert.deepEqual(makeScheduler(kitchen, clock, []).runDue(), ['scout-20261124-1300.md']);

    // A damaged state file is logged once and does not stop the runner.
    fs.writeFileSync(routinesStatePath(kitchen.kitchenDir), '{not json', 'utf8');
    const logs: string[] = [];
    clock.now = new Date(2026, 10, 24, 14, 0, 0);
    fs.rmSync(path.join(kitchen.queued, 'scout-20261124-1300.md'));
    assert.doesNotThrow(() => makeScheduler(kitchen, clock, logs).runDue());
    assert.equal(logs.length, 1);
  } finally {
    fs.rmSync(kitchen.root, { recursive: true, force: true });
  }
});

test('30-minute floor: no routine runs more often than every 30 minutes, whatever its header says', () => {
  assert.equal(ROUTINE_MIN_INTERVAL_MS, 30 * 60 * 1000);
  const parsed = parseRoutine('# Fast\nevery: 1m\n\nbody');
  assert.ok(parsed.ok);
  if (parsed.ok) {
    assert.equal(parsed.schedule.kind, 'every');
    if (parsed.schedule.kind === 'every') {
      assert.equal(parsed.schedule.intervalMs, ROUTINE_MIN_INTERVAL_MS);
    }
  }

  const kitchen = makeKitchen();
  try {
    writeRoutine(kitchen, 'fast.md', ['# Fast', 'every: 5m', '', 'Tiny job.']);
    const clock = { now: new Date(2026, 10, 24, 7, 0, 0) };
    const scheduler = makeScheduler(kitchen, clock, []);
    assert.deepEqual(scheduler.runDue(), ['fast-20261124-0700.md']);
    fs.rmSync(path.join(kitchen.queued, 'fast-20261124-0700.md'));

    clock.now = new Date(2026, 10, 24, 7, 10, 0);
    assert.deepEqual(scheduler.runDue(), [], 'ten minutes is inside the floor');
    clock.now = new Date(2026, 10, 24, 7, 29, 0);
    assert.deepEqual(scheduler.runDue(), [], 'twenty-nine minutes is inside the floor');
    clock.now = new Date(2026, 10, 24, 7, 30, 0);
    assert.deepEqual(scheduler.runDue(), ['fast-20261124-0730.md']);
  } finally {
    fs.rmSync(kitchen.root, { recursive: true, force: true });
  }
});

test('the inbox runner queues a due routine on its tick and runs the copy like any ticket', async () => {
  const kitchen = makeKitchen();
  try {
    writeRoutine(kitchen, 'scout.md', SCOUT);
    const seen: DispatchJobInput[] = [];
    const adapter: DispatchAdapter = {
      name: 'agy',
      async dispatch(input: DispatchJobInput): Promise<DispatchHandle> {
        seen.push(input);
        const output = 'Opened pull request https://github.com/Trollz1004/dream-online/pull/201\nℹ pass 1\nℹ fail 0';
        return {
          jobId: input.jobId ?? 'mock-job',
          adapter: 'agy',
          lane: input.lane,
          harness: 'agy',
          promptPath: path.join(kitchen.root, 'prompt.txt'),
          sanitizedPrompt: input.prompt,
          mode: 'headless-cli',
          httpSessionSupported: false,
          note: 'mock agy run',
          poll: async () => ({ done: true, prUrl: parsePrUrlFromOutput(output), output, exitCode: 0 }),
        };
      },
    };
    const { runner: commandRunner } = createMockInboxCommandRunner({
      ghSignedIn: true,
      branchPushed: () => true,
    });
    const runner = new InboxRunner({
      inboxDir: kitchen.inboxDir,
      worktreeParentDir: path.join(kitchen.root, 'antigravity'),
      decisionsLogPath: path.join(kitchen.root, 'decisions.log'),
      codemapVaultDir: path.join(kitchen.root, 'vault'),
      adapter,
      commandRunner,
      now: () => new Date(2026, 10, 24, 7, 0, 0),
    });

    const result = await runner.tick();
    assert.equal(result.status, 'done');
    assert.equal(result.taskId, 'scout-20261124-0700');
    assert.equal(seen.length, 1);
    assert.ok(!/^\s*every\s*:/im.test(seen[0].prompt), 'the dispatched ticket has no every line');
    const doneCopy = fs.readFileSync(path.join(kitchen.inboxDir, 'done', 'scout-20261124-0700.md'), 'utf8');
    assert.ok(doneCopy.includes('Read the code map and report one stale doc.'));
    assert.ok(fs.existsSync(routinesStatePath(kitchen.kitchenDir)));
  } finally {
    fs.rmSync(kitchen.root, { recursive: true, force: true });
  }
});
