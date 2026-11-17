import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const ESM_PATH = path.join(__dirname, 'env-required.mjs');
const CJS_PATH = path.join(__dirname, 'env-required.cjs');

test('env-required.mjs and env-required.cjs load and produce identical results for dir, file, and object manifests', async () => {
  assert.ok(fs.existsSync(ESM_PATH), 'ops/agents/env-required.mjs must exist');
  assert.ok(fs.existsSync(CJS_PATH), 'ops/agents/env-required.cjs must exist');

  const esm = await import('./env-required.mjs');
  const cjs = require('./env-required.cjs');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'env-required-test-'));
  const manifestPath = path.join(tmpDir, 'env.required.json');
  const manifest = {
    service: 'demo-service',
    node: 'alienware',
    envFile: '.env',
    required: ['PRIMARY_TOKEN', 'API_KEY'],
    alternatives: {
      PRIMARY_TOKEN: ['FLEET_SHARED_TOKEN'],
    },
    optional: ['DEBUG_FLAG'],
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  const fakeFleet = ['rt-fleet', Date.now(), Math.random().toString(36).slice(2)].join('-');
  const fakeApiKey = ['rt-api', Date.now(), Math.random().toString(36).slice(2)].join('-');

  try {
    // Missing all
    const rEmptyEsm = esm.checkRequiredEnv(tmpDir, {});
    const rEmptyCjs = cjs.checkRequiredEnv(manifestPath, {});
    assert.deepEqual(rEmptyEsm, {
      service: 'demo-service',
      envFile: '.env',
      required: ['PRIMARY_TOKEN', 'API_KEY'],
      missingEnv: ['PRIMARY_TOKEN', 'API_KEY'],
      ok: false,
    });
    assert.deepEqual(rEmptyCjs, rEmptyEsm);

    // Whitespace-only counts as missing
    const rWhitespace = esm.checkRequiredEnv(manifest, { PRIMARY_TOKEN: '   ', API_KEY: '\t\n' });
    assert.deepEqual(rWhitespace.missingEnv, ['PRIMARY_TOKEN', 'API_KEY']);
    assert.equal(rWhitespace.ok, false);

    // Alternative satisfies PRIMARY_TOKEN while API_KEY remains missing
    const rAltOnly = esm.checkRequiredEnv(tmpDir, { FLEET_SHARED_TOKEN: fakeFleet, API_KEY: '' });
    assert.deepEqual(rAltOnly.missingEnv, ['API_KEY']);
    assert.equal(rAltOnly.ok, false);
    assert.equal(JSON.stringify(rAltOnly).includes(fakeFleet), false, 'Must never return secret values');

    // All satisfied via alternative + primary
    const rOkEsm = esm.checkRequiredEnv(tmpDir, { FLEET_SHARED_TOKEN: fakeFleet, API_KEY: fakeApiKey });
    const rOkCjs = cjs.checkRequiredEnv(tmpDir, { FLEET_SHARED_TOKEN: fakeFleet, API_KEY: fakeApiKey });
    assert.deepEqual(rOkEsm, {
      service: 'demo-service',
      envFile: '.env',
      required: ['PRIMARY_TOKEN', 'API_KEY'],
      missingEnv: [],
      ok: true,
    });
    assert.deepEqual(rOkCjs, rOkEsm);
    const okText = JSON.stringify(rOkEsm);
    assert.equal(okText.includes(fakeFleet), false);
    assert.equal(okText.includes(fakeApiKey), false);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('logStartupEnvCheck logs only missing setting names via warn, skips when ok, and never throws', async () => {
  const esm = await import('./env-required.mjs');
  const cjs = require('./env-required.cjs');

  const manifest = {
    service: 'sample-svc',
    node: 'alienware',
    envFile: '.env',
    required: ['SVC_TOKEN', 'SECOND_KEY'],
    alternatives: { SVC_TOKEN: ['FLEET_SHARED_TOKEN'] },
  };
  const fakeSecret = ['rt-sec', Date.now(), Math.random().toString(36).slice(2)].join('-');

  // 1. Missing both -> logs exact format
  const warns1 = [];
  const res1 = esm.logStartupEnvCheck(manifest, {}, (msg) => warns1.push(msg));
  assert.equal(res1.ok, false);
  assert.equal(warns1.length, 1);
  assert.equal(warns1[0], '[sample-svc] Startup env check: missing required setting names: SVC_TOKEN, SECOND_KEY');

  // 2. Present SVC_TOKEN (via alternative), missing SECOND_KEY -> logs only SECOND_KEY, never leaks secret
  const warns2 = [];
  const res2 = cjs.logStartupEnvCheck(manifest, { FLEET_SHARED_TOKEN: fakeSecret }, (msg) => warns2.push(msg));
  assert.deepEqual(res2.missingEnv, ['SECOND_KEY']);
  assert.equal(warns2.length, 1);
  assert.equal(warns2[0], '[sample-svc] Startup env check: missing required setting names: SECOND_KEY');
  assert.equal(warns2[0].includes(fakeSecret), false);

  // 3. All satisfied -> zero warnings
  const warns3 = [];
  const res3 = esm.logStartupEnvCheck(manifest, { SVC_TOKEN: fakeSecret, SECOND_KEY: fakeSecret }, (msg) => warns3.push(msg));
  assert.equal(res3.ok, true);
  assert.equal(warns3.length, 0);

  // 4. Non-existent manifest path -> never throws
  const warns4 = [];
  assert.doesNotThrow(() => {
    const res4 = esm.logStartupEnvCheck(path.join(os.tmpdir(), 'does-not-exist-env-required-dir'), {}, (msg) => warns4.push(msg));
    assert.equal(res4.ok, false);
  });
  assert.equal(warns4.length, 1);
});
