import test from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { app, getGenAiClient, GEMINI_LANE_OFF_MESSAGE } from '../server.ts';

const LANE_OFF = 'Gemini lane is off until Josh finalizes a key';

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

test('the lane message is exactly the house wording', () => {
  assert.equal(GEMINI_LANE_OFF_MESSAGE, LANE_OFF);
});

test('getGenAiClient is null unless the key AND GEMINI_KEY_APPROVED=finalize are both set', async () => {
  await withEnv({ GEMINI_API_KEY: undefined, GEMINI_KEY_APPROVED: undefined }, () => {
    assert.equal(getGenAiClient(), null, 'no key, no approval');
  });
  await withEnv({ GEMINI_API_KEY: 'local-test-value', GEMINI_KEY_APPROVED: undefined }, () => {
    assert.equal(getGenAiClient(), null, 'key without approval');
  });
  await withEnv({ GEMINI_API_KEY: 'local-test-value', GEMINI_KEY_APPROVED: 'yes' }, () => {
    assert.equal(getGenAiClient(), null, 'key with a wrong approval value');
  });
  await withEnv({ GEMINI_API_KEY: undefined, GEMINI_KEY_APPROVED: 'finalize' }, () => {
    assert.equal(getGenAiClient(), null, 'approval without a key');
  });
  await withEnv({ GEMINI_API_KEY: 'local-test-value', GEMINI_KEY_APPROVED: 'finalize' }, () => {
    assert.notEqual(getGenAiClient(), null, 'both set builds the client (no network call is made)');
  });
});

test('all four Gemini endpoints answer 503 with the lane-off message while the lane is off', async () => {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  try {
    await withEnv({ GEMINI_API_KEY: 'local-test-value', GEMINI_KEY_APPROVED: undefined }, async () => {
      const cases: Array<[string, Record<string, unknown>]> = [
        ['/api/gm/npc/dialogue', { npcId: 'sup-guide', message: 'hello', zone: 'first-gate' }],
        ['/api/agent-sdk/dispatch', { prompt: 'status' }],
        ['/api/studio/rea-analyze', { fileName: 'artifact.bin', payload: 'DREAM_BINARY_PAYLOAD' }],
        ['/api/studio/generate-design', { prompt: 'Golden Solar Paladin' }],
      ];
      for (const [route, body] of cases) {
        const res = await fetch(base + route, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        assert.equal(res.status, 503, `${route} must be 503`);
        const json = (await res.json()) as { error?: string };
        assert.equal(json.error, LANE_OFF, `${route} must carry the lane-off message`);
      }
    });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
