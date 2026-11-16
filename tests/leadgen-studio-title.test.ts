import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

const LOOPBACK = ['127', '0', '0', '1'].join('.');
const FORBIDDEN_RETIRED_NODE_RE = new RegExp(
  ['sabre' + 'tooth', 'saber' + 'tooth', ['192', '168', '0', '8'].join('\\.')].join('|'),
  'i'
);
const LOOPBACK_REACH_RE = new RegExp(
  [
    '(?:https?|wss?):\\/\\/(?:local' + 'host|127\\.0\\.0\\.1)\\b',
    '\\b(?:local' + 'host|127\\.0\\.0\\.1):\\d{2,5}\\b',
  ].join('|'),
  'i'
);

test('Stage B5: GET / and GET /api/node/status return "Alienware Lead-Gen Command Studio" and "Alienware (192.168.0.40)" with zero retired-node or loopback-reach strings', async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'b5-leadgen-title-'));
  const savedVault = process.env.LEADGEN_VAULT_ROOT;
  const savedState = process.env.LEADGEN_STATE_DIR;
  const savedBind = process.env.HERMES_LEADGEN_BIND;
  const savedToken = process.env.HERMES_LEADGEN_TOKEN;

  process.env.LEADGEN_VAULT_ROOT = path.join(tempRoot, 'vault');
  process.env.LEADGEN_STATE_DIR = path.join(tempRoot, 'state');
  process.env.HERMES_LEADGEN_BIND = '127.0.0.1';
  process.env.HERMES_LEADGEN_TOKEN = 'b5-leadgen-test-token';

  const leadgen = require('../apps/hermes-leadgen/server.js');
  const startedHere = !leadgen.server.listening;
  if (startedHere) {
    await new Promise<void>((resolve) => leadgen.server.listen(0, '127.0.0.1', () => resolve()));
  }
  const { port } = leadgen.server.address() as AddressInfo;
  const baseUrl = `http://${LOOPBACK}:${port}`;

  try {
    const rootRes = await fetch(`${baseUrl}/`);
    assert.equal(rootRes.status, 200);
    const rootHtml = await rootRes.text();
    assert.ok(
      rootHtml.includes('Alienware Lead-Gen Command Studio'),
      'GET / HTML must contain "Alienware Lead-Gen Command Studio"'
    );
    assert.ok(rootHtml.includes('Alienware'), 'GET / HTML must contain "Alienware"');
    assert.ok(rootHtml.includes('http://192.168.0.40:8392/'), 'GET / HTML must reference http://192.168.0.40:8392/');
    assert.ok(!FORBIDDEN_RETIRED_NODE_RE.test(rootHtml), 'GET / HTML must contain zero retired-node strings');
    assert.ok(!LOOPBACK_REACH_RE.test(rootHtml), 'GET / HTML must contain zero loopback-reach strings');

    const statusRes = await fetch(`${baseUrl}/api/node/status`);
    assert.equal(statusRes.status, 200);
    const statusRaw = await statusRes.text();
    const statusJson = JSON.parse(statusRaw);
    assert.equal(statusJson.node, 'Alienware (192.168.0.40)');
    assert.ok(statusJson.node.includes('Alienware'), '/api/node/status node must include "Alienware"');
    assert.ok(
      statusRaw.includes('Alienware Lead-Gen Command Studio'),
      'GET /api/node/status must contain "Alienware Lead-Gen Command Studio"'
    );
    assert.ok(!FORBIDDEN_RETIRED_NODE_RE.test(statusRaw), 'GET /api/node/status must contain zero retired-node strings');
    assert.ok(!LOOPBACK_REACH_RE.test(statusRaw), 'GET /api/node/status must contain zero loopback-reach strings');

    const workerPath = path.join(REPO_ROOT, 'ops', 'opsis-cut-and-reach-studio', 'sabretooth_opsis_worker.mjs');
    const workerRaw = fs.readFileSync(workerPath, 'utf8');
    assert.ok(workerRaw.includes('Alienware (192.168.0.40)'), 'Worker script must identify Alienware (192.168.0.40)');
    assert.ok(!FORBIDDEN_RETIRED_NODE_RE.test(workerRaw), 'Worker script must contain zero retired-node strings');
    assert.ok(!LOOPBACK_REACH_RE.test(workerRaw), 'Worker script must contain zero loopback-reach strings');

    const channelsConfigPath = path.join(REPO_ROOT, 'ops', 'youtube-shorts-podcast', 'channels-config.json');
    const channelsRaw = fs.readFileSync(channelsConfigPath, 'utf8');
    assert.ok(
      channelsRaw.includes('Alienware Lead-Gen Command Studio'),
      'channels-config.json must reference Alienware Lead-Gen Command Studio'
    );
    assert.ok(channelsRaw.includes('Alienware (192.168.0.40)'), 'channels-config.json must reference Alienware (192.168.0.40)');
    assert.ok(!FORBIDDEN_RETIRED_NODE_RE.test(channelsRaw), 'channels-config.json must contain zero retired-node strings');
    assert.ok(!LOOPBACK_REACH_RE.test(channelsRaw), 'channels-config.json must contain zero loopback-reach strings');
  } finally {
    if (startedHere && leadgen.server.listening) {
      await new Promise<void>((resolve) => leadgen.server.close(() => resolve()));
    }
    if (savedVault === undefined) delete process.env.LEADGEN_VAULT_ROOT;
    else process.env.LEADGEN_VAULT_ROOT = savedVault;
    if (savedState === undefined) delete process.env.LEADGEN_STATE_DIR;
    else process.env.LEADGEN_STATE_DIR = savedState;
    if (savedBind === undefined) delete process.env.HERMES_LEADGEN_BIND;
    else process.env.HERMES_LEADGEN_BIND = savedBind;
    if (savedToken === undefined) delete process.env.HERMES_LEADGEN_TOKEN;
    else process.env.HERMES_LEADGEN_TOKEN = savedToken;
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
});
