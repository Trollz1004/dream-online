import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createRequire } from 'node:module';
import type { GoogleGenAI } from '@google/genai';
import {
  HermesDispatchAdapter,
  type CommandExecRequest,
} from '../ops/router/dream-task-router.ts';
import {
  app,
  serverState,
  MAX_SERVER_STATE_ITEMS,
  resolveDreamEngineBindHost,
  validateDreamEngineBindConfig,
  startServer,
  setGenAiClientForTests,
} from '../server.ts';

const require = createRequire(import.meta.url);
const LOOPBACK = ['127', '0', '0', '1'].join('.');

function withEnv(vars: Record<string, string | undefined>, fn: () => Promise<void> | void) {
  const saved: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) saved[k] = process.env[k];
  const restore = () => {
    for (const [k, v] of Object.entries(saved)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  let result: Promise<void> | void;
  try {
    result = fn();
  } catch (err) {
    restore();
    throw err;
  }
  return Promise.resolve(result).finally(restore);
}

test('Finding 4.1, 4.4, 4.5 (apps/hermes-leadgen/server.js): default 0.0.0.0 bind from fleet-map.json, LAN fail-closed, HERMES_LEADGEN_TOKEN / FLEET_SHARED_TOKEN auth on agent/state/proxy/memory routes, Origin check, and agent validation', async () => {
  const leadgen = require('../apps/hermes-leadgen/server.js');

  // 1. Default bind is 0.0.0.0 from ops/fleet/fleet-map.json; explicit 127.0.0.1 is respected
  assert.equal(leadgen.resolveBindHost({}), '0.0.0.0');
  assert.equal(leadgen.resolveBindHost({ HERMES_LEADGEN_BIND: '127.0.0.1' }), '127.0.0.1');
  assert.equal(leadgen.resolveBindHost({ HERMES_LEADGEN_BIND: '0.0.0.0' }), '0.0.0.0');

  // 2. LAN bind without token refuses to start; accepts either HERMES_LEADGEN_TOKEN or FLEET_SHARED_TOKEN
  assert.throws(
    () => leadgen.validateBindConfig({ HERMES_LEADGEN_TOKEN: '', FLEET_SHARED_TOKEN: '' }),
    /HERMES_LEADGEN_TOKEN/i
  );
  assert.equal(
    leadgen.validateBindConfig({ FLEET_SHARED_TOKEN: 'shared-fleet-token' }).token,
    'shared-fleet-token'
  );

  const startedHere = !leadgen.server.listening;
  if (startedHere) {
    await new Promise<void>((resolve) => leadgen.server.listen(0, '127.0.0.1', () => resolve()));
  }
  const { port } = leadgen.server.address() as AddressInfo;
  const loopbackHost = ['127', '0', '0', '1'].join('.');
  const base = `http://${loopbackHost}:${port}`;

  try {
    await withEnv(
      {
        HERMES_LEADGEN_BIND: '0.0.0.0',
        HERMES_LEADGEN_TOKEN: 'leadgen-bearer-secret',
        FLEET_SHARED_TOKEN: 'fleet-shared-secret',
      },
      async () => {
        // 3. POST without bearer is 401
        const unauthedPost = await fetch(`${base}/api/leads/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: 'non-existent-lead-id' }),
        });
        assert.equal(unauthedPost.status, 401);

        // /proxy/*, /api/memory/*, and agent routes (/api/orchestrate) without bearer are 401
        const unauthedProxy = await fetch(`${base}/proxy/fcc/admin`);
        assert.equal(unauthedProxy.status, 401);

        const unauthedMemory = await fetch(`${base}/api/memory/ledger`);
        assert.equal(unauthedMemory.status, 401);

        const unauthedAgent = await fetch(`${base}/api/orchestrate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'status' }),
        });
        assert.equal(unauthedAgent.status, 401);

        // With valid HERMES_LEADGEN_TOKEN succeeds
        const authedPost = await fetch(`${base}/api/leads/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer leadgen-bearer-secret',
          },
          body: JSON.stringify({ id: 'non-existent-lead-id' }),
        });
        assert.equal(authedPost.status, 200);

        // With valid FLEET_SHARED_TOKEN succeeds
        const sharedTokenPost = await fetch(`${base}/api/leads/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Fleet-Token': 'fleet-shared-secret',
          },
          body: JSON.stringify({ id: 'non-existent-lead-id' }),
        });
        assert.equal(sharedTokenPost.status, 200);

        // State-changing methods check Origin
        for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
          const badOriginRes = await fetch(`${base}/api/node/status`, {
            method,
            headers: {
              Origin: 'http://evil.example.com',
              Authorization: 'Bearer leadgen-bearer-secret',
            },
          });
          assert.equal(badOriginRes.status, 403, `${method} with foreign Origin must be 403`);
        }

        // 4. Bad agent value is 400
        const badAgentRes = await fetch(`${base}/api/hooks/push-pr`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer leadgen-bearer-secret',
          },
          body: JSON.stringify({
            runGitPushPr: true,
            agent: '../bad-agent',
            profile: 'default',
          }),
        });
        assert.equal(badAgentRes.status, 400);
      }
    );
  } finally {
    if (startedHere && leadgen.server.listening) {
      await new Promise<void>((resolve) => leadgen.server.close(() => resolve()));
    }
  }
});

test('Finding 4.2 (ops/router/adapters/hermes.ts): rejects injected jobId, traversal jobId, and unknown jobClass; produces expected ssh argv array', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-sec-run1-a-'));
  try {
    const calls: CommandExecRequest[] = [];
    const adapter = new HermesDispatchAdapter({
      stagingDir: tmpDir,
      runner: async (req) => {
        calls.push(req);
        return { exitCode: 0, stdout: 'https://github.com/Trollz1004/dream-online/pull/81', stderr: '' };
      },
    });

    // 1. Injected jobId is rejected
    await assert.rejects(
      () =>
        adapter.dispatch({
          jobId: 'job_1; id',
          prompt: 'Run safe task',
          jobClass: 'post-x',
          lane: 'grok',
          harness: 'hermes',
        }),
      /invalid jobId/i
    );

    // 2. Traversal jobId is rejected
    await assert.rejects(
      () =>
        adapter.dispatch({
          jobId: '../escaped-file',
          prompt: 'Run safe task',
          jobClass: 'post-x',
          lane: 'grok',
          harness: 'hermes',
        }),
      /invalid jobId|stagingDir/i
    );

    // 3. Unknown jobClass is rejected
    await assert.rejects(
      () =>
        adapter.dispatch({
          jobId: 'valid_job_01',
          prompt: 'Run safe task',
          jobClass: 'invalid-class' as any,
          lane: 'grok',
          harness: 'hermes',
        }),
      /unknown jobClass/i
    );

    // 4. Good jobId produces expected argv array without shell-line interpolation
    const handle = await adapter.dispatch({
      jobId: 'good_job-42',
      prompt: 'Run safe task',
      jobClass: 'post-x',
      lane: 'grok',
      harness: 'hermes',
    });
    await handle.poll();
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].args, [
      'sabretooth',
      'hermes',
      '-z',
      '--query-file',
      '~/.fable-kitchen/good_job-42.txt',
    ]);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Finding 4.3a & 4.3b (server.ts): no-token defaults to 127.0.0.1 with warning, token resolves 0.0.0.0 from fleet-map.json, explicit LAN bind without token refuses to start, and LAN-bound state-changing & agent/spend routes require DREAM_ENGINE_TOKEN or FLEET_SHARED_TOKEN', async () => {
  // Without tokens, unset bind falls back to 127.0.0.1; with a token, unset bind uses 0.0.0.0 from ops/fleet/fleet-map.json
  assert.equal(resolveDreamEngineBindHost({ DREAM_ENGINE_TOKEN: '', FLEET_SHARED_TOKEN: '' }), '127.0.0.1');
  assert.equal(resolveDreamEngineBindHost({ DREAM_ENGINE_TOKEN: 'engine-token' }), '0.0.0.0');
  assert.equal(resolveDreamEngineBindHost({ DREAM_ENGINE_BIND: '127.0.0.1', DREAM_ENGINE_TOKEN: 'engine-token' }), '127.0.0.1');
  assert.equal(resolveDreamEngineBindHost({ DREAM_ENGINE_BIND: '0.0.0.0' }), '0.0.0.0');

  const noTokenConfig = validateDreamEngineBindConfig({ DREAM_ENGINE_TOKEN: '', FLEET_SHARED_TOKEN: '' });
  assert.equal(noTokenConfig.host, '127.0.0.1');
  assert.equal(noTokenConfig.token, '');
  assert.match(String(noTokenConfig.warning), /DREAM_ENGINE_TOKEN/);
  assert.match(String(noTokenConfig.warning), /FLEET_SHARED_TOKEN/);

  // Fail closed when explicitly bound to 0.0.0.0 or LAN IP and both DREAM_ENGINE_TOKEN and FLEET_SHARED_TOKEN are empty
  assert.throws(
    () => validateDreamEngineBindConfig({ DREAM_ENGINE_BIND: '0.0.0.0', DREAM_ENGINE_TOKEN: '', FLEET_SHARED_TOKEN: '' }),
    /DREAM_ENGINE_TOKEN/i
  );
  assert.throws(
    () => validateDreamEngineBindConfig({ DREAM_ENGINE_BIND: '192.168.0.40', DREAM_ENGINE_TOKEN: '', FLEET_SHARED_TOKEN: '' }),
    /DREAM_ENGINE_TOKEN/i
  );
  await assert.rejects(
    () => startServer({ DREAM_ENGINE_BIND: '0.0.0.0', DREAM_ENGINE_TOKEN: '   ', FLEET_SHARED_TOKEN: '' }),
    /DREAM_ENGINE_TOKEN/i
  );
  assert.equal(
    validateDreamEngineBindConfig({ FLEET_SHARED_TOKEN: 'shared-fleet-secret' }).token,
    'shared-fleet-secret'
  );
  assert.equal(
    validateDreamEngineBindConfig({ FLEET_SHARED_TOKEN: 'shared-fleet-secret' }).host,
    '0.0.0.0'
  );

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const loopbackHost = ['127', '0', '0', '1'].join('.');
  const base = `http://${loopbackHost}:${port}`;

  try {
    await withEnv(
      { DREAM_ENGINE_BIND: '0.0.0.0', DREAM_ENGINE_TOKEN: 'engine-bearer-secret', FLEET_SHARED_TOKEN: 'fleet-shared-secret' },
      async () => {
        for (const [route, payload] of [
          ['/api/gm/economy/mint', { amount: 10, reason: 'test' }],
          ['/api/gm/world/nightfall', { state: 'day' }],
          ['/api/gm/hotfix/propose', { proposal: 'safe patch' }],
          ['/api/memory/store', { title: 'Note', content: 'Safe note' }],
          ['/api/cli-anything/execute', { command: 'status' }],
          ['/api/dreamforge/generate', { prompt: 'Crimson Vanguard' }],
        ] as const) {
          const unauthedRes = await fetch(base + route, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          assert.equal(unauthedRes.status, 401, `${route} without bearer must return 401`);

          const wrongBearerRes = await fetch(base + route, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer wrong-token',
            },
            body: JSON.stringify(payload),
          });
          assert.equal(wrongBearerRes.status, 401, `${route} with wrong bearer must return 401`);

          const authedRes = await fetch(base + route, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer engine-bearer-secret',
            },
            body: JSON.stringify(payload),
          });
          assert.equal(authedRes.status, 200, `${route} with valid DREAM_ENGINE_TOKEN must return 200`);

          const sharedTokenRes = await fetch(base + route, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Fleet-Token': 'fleet-shared-secret',
            },
            body: JSON.stringify(payload),
          });
          assert.equal(sharedTokenRes.status, 200, `${route} with valid FLEET_SHARED_TOKEN must return 200`);
        }

        // Agent/spend route (/api/agent-sdk/dispatch) also requires token before running
        const unauthedAgent = await fetch(`${base}/api/agent-sdk/dispatch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'status' }),
        });
        assert.equal(unauthedAgent.status, 401);
      }
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Finding 4.3c & 4.3d (server.ts): POST /api/gm/npc/dialogue redacts message via redactSecretsWithXXXX before storing, and serverState.memoryEntries / checkpoints cap at 200', async () => {
  const savedEntries = [...serverState.memoryEntries];
  const savedCheckpoints = [...serverState.checkpoints];

  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const base = `http://${LOOPBACK}:${port}`;

  setGenAiClientForTests({
    models: {
      generateContent: async () => ({ text: 'Acknowledged in First Gate.' }),
    },
  } as unknown as GoogleGenAI);

  try {
    await withEnv({ DREAM_ENGINE_BIND: '127.0.0.1' }, async () => {
      const fakeGoogleKey = 'AIza' + 'SyD9a8b7c6d5e4f3g2h1i0j9k8l7m6n5o4';
      const fakeOpenAiKey = 'sk-proj-' + '99887766554433221100aabbccddeeff';
      const dialogueRes = await fetch(`${base}/api/gm/npc/dialogue`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          npcId: 'sup-guide',
          zone: 'first-gate',
          message: `Check keys ${fakeGoogleKey} and ${fakeOpenAiKey}`,
        }),
      });
      assert.equal(dialogueRes.status, 200);

      const latestEntry = serverState.memoryEntries[0];
      assert.ok(latestEntry, 'Expected dialogue memory entry to be stored');
      assert.equal(latestEntry.l1Overview.includes(fakeGoogleKey), false);
      assert.equal(latestEntry.l1Overview.includes(fakeOpenAiKey), false);
      assert.equal(latestEntry.l2Markdown.includes(fakeGoogleKey), false);
      assert.equal(latestEntry.l2Markdown.includes(fakeOpenAiKey), false);
      assert.equal(latestEntry.l1Overview.includes('XXXX'), true);
      assert.equal(latestEntry.l2Markdown.includes('XXXX'), true);

      // Verify cap at 200 (drop oldest) for memoryEntries and checkpoints
      assert.equal(MAX_SERVER_STATE_ITEMS, 200);

      for (let i = 1; i <= 210; i++) {
        const memRes = await fetch(`${base}/api/memory/store`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Cap Test Entry ${i}`,
            content: `Entry body ${i}`,
          }),
        });
        assert.equal(memRes.status, 200);

        const cpRes = await fetch(`${base}/api/gm/hotfix/propose`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proposal: `Cap Test Checkpoint ${i}`,
          }),
        });
        assert.equal(cpRes.status, 200);
      }

      assert.equal(serverState.memoryEntries.length, 200);
      assert.equal(serverState.memoryEntries[0].title, 'Cap Test Entry 210');
      assert.equal(
        serverState.memoryEntries.some((e) => e.title === 'Cap Test Entry 1'),
        false,
        'Oldest memory entries beyond 200 must be dropped'
      );

      assert.equal(serverState.checkpoints.length, 200);
      assert.ok(serverState.checkpoints[0].meta.includes('Cap Test Checkpoint 210'));
      assert.equal(
        serverState.checkpoints.some((c) => c.meta.includes('Cap Test Checkpoint 1"')),
        false,
        'Oldest checkpoints beyond 200 must be dropped'
      );
    });
  } finally {
    setGenAiClientForTests(null);
    serverState.memoryEntries.splice(0, serverState.memoryEntries.length, ...savedEntries);
    serverState.checkpoints.splice(0, serverState.checkpoints.length, ...savedCheckpoints);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('Requirement 4 (.env.example): documents DREAM_ENGINE_BIND, DREAM_ENGINE_TOKEN, HERMES_LEADGEN_BIND, and HERMES_LEADGEN_TOKEN with empty values and one-line comments', () => {
  const envExample = fs.readFileSync(path.resolve(process.cwd(), '.env.example'), 'utf8');
  for (const key of [
    'DREAM_ENGINE_BIND',
    'DREAM_ENGINE_TOKEN',
    'HERMES_LEADGEN_BIND',
    'HERMES_LEADGEN_TOKEN',
  ]) {
    const re = new RegExp(`^# .+\\r?\\n${key}=$`, 'm');
    assert.match(envExample, re, `Expected one-line comment followed by empty ${key}= in .env.example`);
  }
});


test('server.ts: LAN-bound POST to /api/cli-anything/execute without a bearer is 401, GET is unauthenticated, loopback is unauthenticated', async () => {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const base = `http://${LOOPBACK}:${port}`;

  try {
    // 1. LAN-bound (0.0.0.0): POST to /api/cli-anything/execute without bearer is 401
    await withEnv(
      { DREAM_ENGINE_BIND: '0.0.0.0', DREAM_ENGINE_TOKEN: 'engine-bearer-secret' },
      async () => {
        const unauthedPost = await fetch(`${base}/api/cli-anything/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'status' }),
        });
        assert.equal(unauthedPost.status, 401, 'POST /api/cli-anything/execute without bearer must return 401');

        const authedPost = await fetch(`${base}/api/cli-anything/execute`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer engine-bearer-secret',
          },
          body: JSON.stringify({ command: 'status' }),
        });
        assert.equal(authedPost.status, 200, 'POST /api/cli-anything/execute with bearer must return 200');

        // GET remains unauthenticated
        const getRes = await fetch(`${base}/api/cli-anything/help`);
        assert.equal(getRes.status, 200, 'GET /api/cli-anything/help must remain unauthenticated');
      }
    );

    // 2. Loopback (127.0.0.1): POST is unauthenticated
    await withEnv(
      { DREAM_ENGINE_BIND: '127.0.0.1' },
      async () => {
        const loopbackPost = await fetch(`${base}/api/cli-anything/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'status' }),
        });
        assert.equal(loopbackPost.status, 200, 'Loopback POST to /api/cli-anything/execute must remain unauthenticated');
      }
    );
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test('server.ts live-start: no token with unset DREAM_ENGINE_BIND binds 127.0.0.1, emits one warning naming missing setting, and serves clean HTTP responses', async () => {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map((a) => String(a)).join(' '));
  };
  let srv: Server | null = null;
  try {
    await withEnv(
      { DREAM_ENGINE_TOKEN: '', FLEET_SHARED_TOKEN: '', DREAM_ENGINE_BIND: '' },
      async () => {
        srv = await startServer({
          NODE_ENV: 'production',
          PORT: '0',
          DREAM_ENGINE_TOKEN: '',
          FLEET_SHARED_TOKEN: '',
          DREAM_ENGINE_BIND: '',
        });
        if (!srv.listening) {
          await new Promise<void>((resolve) => srv!.once('listening', resolve));
        }
        const addr = srv.address() as AddressInfo;
        assert.equal(addr.address, '127.0.0.1');
        assert.equal(warnings.length, 1);
        assert.match(warnings[0], /DREAM_ENGINE_TOKEN/);
        assert.match(warnings[0], /FLEET_SHARED_TOKEN/);
        assert.match(warnings[0], /127\.0\.0\.1/);

        const base = `http://${LOOPBACK}:${addr.port}`;
        const healthRes = await fetch(`${base}/api/gm/health`);
        assert.equal(healthRes.status, 200);
        const postRes = await fetch(`${base}/api/cli-anything/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: 'status' }),
        });
        assert.equal(postRes.status, 200);
      }
    );
  } finally {
    console.warn = origWarn;
    if (srv) {
      await new Promise<void>((resolve) => srv!.close(() => resolve()));
    }
  }
});
