import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildOmnirouteClaudeCodeCommand,
  LAST_RESORT_CONCURRENCY,
  LAST_RESORT_MODEL,
  LAST_RESORT_TIMEOUT_MS,
  OmnirouteClaudeCodeAdapter,
  readOmnirouteBaseUrl,
  resolveLastResortEnabled,
} from './omniroute-claude-code.ts';
import type { CommandExecRequest, CommandRunner } from './types.ts';

const FLEET_MAP = path.resolve('ops/fleet/fleet-map.json');

test('readOmnirouteBaseUrl reads the OmniRoute address from the fleet map', () => {
  const url = readOmnirouteBaseUrl(FLEET_MAP);
  assert.equal(url, 'http://192.168.0.15:20128');
});

test('LAST_RESORT_ENABLED defaults to on and turns off only on an explicit false', () => {
  assert.equal(resolveLastResortEnabled({}), true);
  assert.equal(resolveLastResortEnabled({ LAST_RESORT_ENABLED: 'true' }), true);
  assert.equal(resolveLastResortEnabled({ LAST_RESORT_ENABLED: 'false' }), false);
  assert.equal(resolveLastResortEnabled({ LAST_RESORT_ENABLED: '0' }), false);
});

test('the last-resort command runs claude headless against OmniRoute with a placeholder token and model auto', () => {
  const built = buildOmnirouteClaudeCodeCommand({
    prompt: 'Fix the race in src/scheduler/queue.ts',
    cwd: 'C:/work/ticket',
    baseUrl: 'http://192.168.0.15:20128',
  });
  assert.equal(built.command, 'claude');
  assert.equal(built.cwd, 'C:/work/ticket');
  assert.ok(built.args.includes('--model'));
  assert.ok(built.args.includes('auto'));
  assert.ok(built.args.includes('--permission-mode'));
  assert.ok(built.args.includes('acceptEdits'));
  assert.equal(built.stdin, 'ignore');
  assert.equal(built.windowsHide, true);
  assert.equal(built.timeoutMs, LAST_RESORT_TIMEOUT_MS);
  assert.equal(built.env.ANTHROPIC_BASE_URL, 'http://192.168.0.15:20128');
  assert.equal(built.env.ANTHROPIC_AUTH_TOKEN, 'omniroute-local');
  assert.equal(built.env.ANTHROPIC_MODEL, LAST_RESORT_MODEL);
  assert.equal(built.env.ANTHROPIC_SMALL_FAST_MODEL, 'auto/best-fast');
  // The signed-in login must never be forwarded.
  assert.equal('ANTHROPIC_API_KEY' in built.env, false);
  // The executor rules ride in front of the ticket text.
  const promptArg = built.args[built.args.indexOf('-p') + 1];
  assert.match(promptArg, /^PR only\./);
  assert.match(promptArg, /Fix the race in src\/scheduler\/queue\.ts$/);
});

test('the adapter runs through a fake launcher, two at a time, and records the lane it built on', async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-last-resort-'));
  const seen: CommandExecRequest[] = [];
  let running = 0;
  let peak = 0;
  const runner: CommandRunner = (req) => {
    seen.push(req);
    running += 1;
    peak = Math.max(peak, running);
    return new Promise((resolve) => {
      setTimeout(() => {
        running -= 1;
        resolve({
          exitCode: 0,
          stdout: 'Opened pull request https://github.com/Trollz1004/dream-online/pull/900',
          stderr: '',
        });
      }, 30);
    });
  };

  const adapter = new OmnirouteClaudeCodeAdapter({
    commandRunner: runner,
    fleetMapPath: FLEET_MAP,
    kitchenDir: tmp,
    env: {},
  });

  const jobs = ['one', 'two', 'three'].map((id) =>
    adapter.dispatch({
      jobId: id,
      prompt: `do ${id}`,
      jobClass: 'mechanical',
      lane: 'last-resort',
      harness: 'omniroute-claude-code',
      cwd: tmp,
    })
  );
  const handles = await Promise.all(jobs);
  const polls = await Promise.all(handles.map((h) => h.poll()));

  assert.equal(peak, LAST_RESORT_CONCURRENCY);
  assert.equal(seen.length, 3);
  assert.ok(polls.every((p) => p.exitCode === 0 && p.prUrl?.endsWith('/900')));
  const log = fs.readFileSync(path.join(tmp, 'one.log'), 'utf8');
  assert.match(log, /built by the last-resort lane/);
});

test('the command keeps the inherited environment, lays the OmniRoute values over it and drops any Anthropic key', () => {
  const built = buildOmnirouteClaudeCodeCommand({
    prompt: 'do it',
    baseUrl: 'http://192.168.0.15:20128',
    env: { PATH: 'C:\\tools', ANTHROPIC_API_KEY: 'should-not-pass', ANTHROPIC_BASE_URL: 'https://elsewhere' },
  });
  assert.equal(built.env.PATH, 'C:\\tools');
  assert.equal(built.env.ANTHROPIC_API_KEY, undefined);
  assert.equal(built.env.ANTHROPIC_BASE_URL, 'http://192.168.0.15:20128');
  assert.equal(built.env.ANTHROPIC_AUTH_TOKEN, 'omniroute-local');
});
