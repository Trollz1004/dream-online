import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.join(__dirname, 'fleet-status-server.mjs');
const LOOPBACK = ['127', '0', '0', '1'].join('.');

function makeMockService(handler) {
  return new Promise((resolve) => {
    const srv = http.createServer(handler);
    srv.listen(0, LOOPBACK, () => {
      const addr = srv.address();
      resolve({ server: srv, port: addr.port });
    });
  });
}

function closeServer(srv) {
  return new Promise((resolve) => srv.close(() => resolve()));
}

test('fleet-status-server bind rule: unset FLEET_SHARED_TOKEN binds 127.0.0.1 with warning; non-empty token binds 0.0.0.0', async () => {
  const mod = await import('./fleet-status-server.mjs');

  const noToken = mod.validateFleetStatusBindConfig({ FLEET_SHARED_TOKEN: '' }, 'alienware-fleet-status');
  assert.equal(noToken.host, LOOPBACK);
  assert.match(String(noToken.warning), /FLEET_SHARED_TOKEN/);
  assert.match(String(noToken.warning), /9165/);

  const withTokenValue = 'super-secret-fleet-tok';
  const withToken = mod.validateFleetStatusBindConfig({ FLEET_SHARED_TOKEN: withTokenValue }, 'alienware-fleet-status');
  assert.equal(withToken.host, '0.0.0.0');
  assert.equal(withToken.warning, null);

  assert.throws(
    () => mod.validateFleetStatusBindConfig({ FLEET_STATUS_BIND: '0.0.0.0', FLEET_SHARED_TOKEN: '' }, 'alienware-fleet-status'),
    /FLEET_SHARED_TOKEN/,
  );
});

test('fleet-status-server reports green, amber (drift & missingEnv), red (flashing), and t5500 identity over HTTP /health and /api/status', async () => {
  const mod = await import('./fleet-status-server.mjs');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-status-test-'));
  const driftPath = path.join(tmpDir, 'agent-drift.json');
  const envStatusPath = path.join(tmpDir, 'env-status.json');
  const healthyEnv = { FLEET_SHARED_TOKEN: 'test-fleet-secret', ENV_STATUS_PATH: envStatusPath };

  const healthySvc = await makeMockService((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'mock-svc' }));
  });
  const missingEnvSvc = await makeMockService((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'env-svc', serviceMissingEnv: ['GEMINI_API_KEY'] }));
  });

  try {
    // 1. Green: services UP + clean agent-drift.json + no missingEnv
    fs.writeFileSync(
      driftPath,
      JSON.stringify({ checkedAt: '2026-11-16T00:00:00Z', node: 'alienware', ok: true, light: 'green', driftedCount: 0, driftedFiles: [] }),
      'utf8',
    );
    const { server: s1 } = mod.createFleetStatusServer({
      node: 'alienware',
      env: healthyEnv,
      agentDriftPath: driftPath,
      targets: [{ id: 'mock-svc', name: 'Mock Service', host: LOOPBACK, port: healthySvc.port, healthPath: '/health', expectedIdentity: 'mock-svc' }],
    });
    await new Promise((r) => s1.listen(0, LOOPBACK, r));
    const p1 = s1.address().port;
    try {
      const healthRes = await fetch(`http://${LOOPBACK}:${p1}/health`);
      assert.equal(healthRes.status, 200);
      const hJson = await healthRes.json();
      assert.equal(hJson.ok, true);
      assert.equal(hJson.service, 'alienware-fleet-status');
      assert.equal(hJson.node, 'alienware');
      assert.equal(hJson.light, 'green');
      assert.equal(hJson.flashing, false);
      assert.deepEqual(hJson.driftedFiles, []);
      assert.deepEqual(hJson.missingEnv, []);
      assert.deepEqual(hJson.reasons, []);
      assert.ok(hJson.checkedAt);

      const apiRes = await fetch(`http://${LOOPBACK}:${p1}/api/status`);
      assert.equal(apiRes.status, 200);
      const aJson = await apiRes.json();
      assert.equal(aJson.light, 'green');
      assert.equal(aJson.flashing, false);
    } finally {
      await closeServer(s1);
    }

    // 2. Amber from agent-drift.json
    fs.writeFileSync(
      driftPath,
      JSON.stringify({
        checkedAt: '2026-11-16T00:00:00Z',
        node: 'alienware',
        ok: false,
        light: 'amber',
        driftedCount: 2,
        driftedFiles: [
          { file: 'AGENTS.md', reason: 'drifted' },
          { file: '%USERPROFILE%\\.claude\\CLAUDE.md', reason: 'missing-block' },
        ],
      }),
      'utf8',
    );
    const { server: s2 } = mod.createFleetStatusServer({
      node: 'alienware',
      env: healthyEnv,
      agentDriftPath: driftPath,
      targets: [{ id: 'mock-svc', name: 'Mock Service', host: LOOPBACK, port: healthySvc.port, healthPath: '/health', expectedIdentity: 'mock-svc' }],
    });
    await new Promise((r) => s2.listen(0, LOOPBACK, r));
    const p2 = s2.address().port;
    try {
      const j = await (await fetch(`http://${LOOPBACK}:${p2}/api/status`)).json();
      assert.equal(j.light, 'amber');
      assert.equal(j.flashing, false);
      assert.equal(j.driftedFiles.length, 2);
      assert.ok(j.reasons.some((r) => r.includes('AGENTS.md')));
      assert.ok(j.reasons.some((r) => r.includes('CLAUDE.md')));
    } finally {
      await closeServer(s2);
    }

    // 3. Amber from serviceMissingEnv even when agent-drift.json is clean
    fs.writeFileSync(
      driftPath,
      JSON.stringify({ checkedAt: '2026-11-16T00:00:00Z', node: 'alienware', ok: true, light: 'green', driftedCount: 0, driftedFiles: [] }),
      'utf8',
    );
    const { server: s3 } = mod.createFleetStatusServer({
      node: 'alienware',
      env: healthyEnv,
      agentDriftPath: driftPath,
      serviceMissingEnv: ['FLEET_SHARED_TOKEN'],
      targets: [{ id: 'env-svc', name: 'Env Service', host: LOOPBACK, port: missingEnvSvc.port, healthPath: '/health', expectedIdentity: 'env-svc' }],
    });
    await new Promise((r) => s3.listen(0, LOOPBACK, r));
    const p3 = s3.address().port;
    try {
      const j = await (await fetch(`http://${LOOPBACK}:${p3}/health`)).json();
      assert.equal(j.light, 'amber');
      assert.equal(j.flashing, false);
      assert.deepEqual(j.missingEnv, ['FLEET_SHARED_TOKEN', 'GEMINI_API_KEY']);
      assert.ok(j.reasons.some((r) => r.includes('FLEET_SHARED_TOKEN')));
      assert.ok(j.reasons.some((r) => r.includes('GEMINI_API_KEY')));
    } finally {
      await closeServer(s3);
    }

    // 4. Red (flashing: true) when a monitored service is down, + T5500 identity
    const downPortSvc = await makeMockService((req, res) => { res.writeHead(200); res.end('ok'); });
    const closedPort = downPortSvc.port;
    await closeServer(downPortSvc.server);

    const { server: s4 } = mod.createFleetStatusServer({
      node: 't5500',
      env: healthyEnv,
      agentDriftPath: driftPath,
      targets: [{ id: 'down-svc', name: 'Down Service', host: LOOPBACK, port: closedPort, healthPath: '/health', expectedIdentity: 'ok' }],
    });
    await new Promise((r) => s4.listen(0, LOOPBACK, r));
    const p4 = s4.address().port;
    try {
      const j = await (await fetch(`http://${LOOPBACK}:${p4}/health`)).json();
      assert.equal(j.ok, true);
      assert.equal(j.service, 't5500-fleet-status');
      assert.equal(j.node, 't5500');
      assert.equal(j.light, 'red');
      assert.equal(j.flashing, true);
      assert.ok(j.reasons.some((r) => r.includes('Down Service') || r.includes('down-svc')));
    } finally {
      await closeServer(s4);
    }
  } finally {
    await closeServer(healthySvc.server);
    await closeServer(missingEnvSvc.server);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('fleet-status-server CLI live-start without FLEET_SHARED_TOKEN binds 127.0.0.1, emits one warning line naming FLEET_SHARED_TOKEN, and serves /health', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-status-cli-'));
  const driftPath = path.join(tmpDir, 'agent-drift.json');
  fs.writeFileSync(
    driftPath,
    JSON.stringify({
      checkedAt: '2026-11-16T00:00:00Z',
      node: 'alienware',
      ok: false,
      light: 'amber',
      driftedCount: 1,
      driftedFiles: [{ file: 'GEMINI.md', reason: 'drifted' }],
    }),
    'utf8',
  );

  const child = spawn(process.execPath, [SERVER_PATH], {
    env: {
      ...process.env,
      PORT: '0',
      FLEET_NODE: 'alienware',
      FLEET_SHARED_TOKEN: '',
      FLEET_STATUS_BIND: '',
      AGENT_DRIFT_PATH: driftPath,
      FLEET_STATUS_TARGETS: '[]',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  const listenRe = new RegExp(`Listening on http:\\/\\/${LOOPBACK.replace(/\./g, '\\.')}:(\\d+)`);

  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for fleet-status start: stdout=${stdout} stderr=${stderr}`)), 10000);
      child.stdout.on('data', (c) => {
        stdout += String(c);
        const m = listenRe.exec(stdout);
        if (m) {
          clearTimeout(timer);
          resolve(Number(m[1]));
        }
      });
      child.stderr.on('data', (c) => {
        stderr += String(c);
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`fleet-status exited early (${code}): stdout=${stdout} stderr=${stderr}`));
      });
    });

    const warnings = stderr.trim().split(/\r?\n/).filter(Boolean);
    assert.equal(warnings.length, 2);
    assert.match(warnings[0], /FLEET_SHARED_TOKEN/);
    assert.match(warnings[0], /127\.0\.0\.1/);
    assert.match(warnings[1], /\[fleet-status\] Startup env check: missing required setting names: FLEET_SHARED_TOKEN/);

    const res = await fetch(`http://${LOOPBACK}:${port}/health`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.service, 'alienware-fleet-status');
    assert.equal(json.light, 'amber');
    assert.equal(json.flashing, false);
    assert.deepEqual(json.driftedFiles, [{ file: 'GEMINI.md', reason: 'drifted' }]);
    assert.deepEqual(json.missingEnv, ['FLEET_SHARED_TOKEN']);
    assert.deepEqual(json.serviceMissingEnv, ['FLEET_SHARED_TOKEN']);
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
      await new Promise((r) => child.once('exit', r));
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('Stage E4 (fleet-status): env.required.json exists and missing FLEET_SHARED_TOKEN automatically sets amber + missingEnv + serviceMissingEnv', async () => {
  const manifestPath = path.join(__dirname, 'env.required.json');
  assert.equal(fs.existsSync(manifestPath), true, 'ops/fleet/env.required.json must exist');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  assert.deepEqual(manifest.required, ['FLEET_SHARED_TOKEN']);

  const mod = await import('./fleet-status-server.mjs');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-status-e4-'));
  const driftPath = path.join(tmpDir, 'agent-drift.json');
  const envStatusPath = path.join(tmpDir, 'env-status.json');
  fs.writeFileSync(
    driftPath,
    JSON.stringify({ checkedAt: '2026-11-16T00:00:00Z', node: 'alienware', ok: true, light: 'green', driftedCount: 0, driftedFiles: [] }),
    'utf8',
  );
  const healthySvc = await makeMockService((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'mock-svc', missingEnv: [] }));
  });

  const { server } = mod.createFleetStatusServer({
    node: 'alienware',
    env: { FLEET_SHARED_TOKEN: '', ENV_STATUS_PATH: envStatusPath },
    agentDriftPath: driftPath,
    targets: [{ id: 'mock-svc', name: 'Mock Service', host: LOOPBACK, port: healthySvc.port, healthPath: '/health', expectedIdentity: 'mock-svc' }],
  });
  await new Promise((r) => server.listen(0, LOOPBACK, r));
  try {
    const port = server.address().port;
    const hJson = await (await fetch(`http://${LOOPBACK}:${port}/health`)).json();
    assert.equal(hJson.light, 'amber');
    assert.equal(hJson.flashing, false);
    assert.deepEqual(hJson.missingEnv, ['FLEET_SHARED_TOKEN']);
    assert.deepEqual(hJson.serviceMissingEnv, ['FLEET_SHARED_TOKEN']);
    assert.ok(hJson.reasons.some((r) => r.includes('FLEET_SHARED_TOKEN')));

    const sJson = await (await fetch(`http://${LOOPBACK}:${port}/api/status`)).json();
    assert.equal(sJson.light, 'amber');
    assert.deepEqual(sJson.missingEnv, ['FLEET_SHARED_TOKEN']);
    assert.deepEqual(sJson.serviceMissingEnv, ['FLEET_SHARED_TOKEN']);
  } finally {
    await closeServer(server);
    await closeServer(healthySvc.server);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
