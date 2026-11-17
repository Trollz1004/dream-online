import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  FLEET_MAP_PATH,
  loadFleetMap,
  getNode,
  getNodeHost,
  getAllowedNodeHosts,
  getService,
  getServiceBindHost,
  getServicePort,
  getServiceUrl,
  getServiceHealthUrl,
  getServicesByNode,
  getServicesByScope,
} from './fleet-map.mjs';
import { copyFleetMap } from './copy-fleet-map.mjs';

const require = createRequire(import.meta.url);
const cjsFleet = require('./fleet-map.cjs');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

const REQUIRED_SERVICE_KEYS = [
  'id',
  'name',
  'node',
  'host',
  'port',
  'protocol',
  'scope',
  'bind',
  'authTokenEnv',
  'healthPath',
  'expectedIdentity',
  'ownerLane',
];

const FORBIDDEN_OLD_IP = ['192', '168', '0', '8'].join('.');
const FORBIDDEN_OLD_NODE_RE = new RegExp(['sabre' + 'tooth', 'saber' + 'tooth'].join('|'), 'i');
const LOOPBACK_HOST = ['127', '0', '0', '1'].join('.');

test('fleet-map.json defines only alienware (192.168.0.40) and t5500 (192.168.0.15) with zero retired node references', () => {
  const raw = fs.readFileSync(FLEET_MAP_PATH, 'utf8');
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(raw), 'fleet-map.json must never mention the retired third node');
  assert.ok(!raw.includes(FORBIDDEN_OLD_IP), 'fleet-map.json must never contain the retired third-node IP');

  const map = loadFleetMap();
  assert.deepEqual(Object.keys(map.nodes).sort(), ['alienware', 't5500']);
  assert.equal(getNodeHost('alienware'), '192.168.0.40');
  assert.equal(getNodeHost('t5500'), '192.168.0.15');
  assert.deepEqual(getAllowedNodeHosts().sort(), ['192.168.0.15', '192.168.0.40']);
});

test('every service in fleet-map.json has all required fields and valid node/scope/bind', () => {
  const map = loadFleetMap();
  assert.ok(Array.isArray(map.services) && map.services.length >= 20);

  for (const svc of map.services) {
    for (const key of REQUIRED_SERVICE_KEYS) {
      assert.ok(Object.hasOwn(svc, key), `service ${svc.id} is missing key ${key}`);
    }
    assert.ok(svc.node === 'alienware' || svc.node === 't5500', `invalid node on ${svc.id}`);
    assert.equal(typeof svc.port, 'number');
    assert.ok(svc.port > 0 && svc.port <= 65535);
    assert.ok(
      ['lan', 'lan-guarded', 'this machine only'].includes(svc.scope),
      `unexpected scope "${svc.scope}" on ${svc.id}`
    );
  }
});

test('Postgres 5432, Redis 6379, and Obsidian REST 27123 are marked "this machine only" with bind "127.0.0.1"', () => {
  const localOnly = getServicesByScope('this machine only');
  const ports = localOnly.map((s) => s.port).sort((a, b) => a - b);
  assert.deepEqual(ports, [5432, 6379, 27123, 27123]);
  for (const svc of localOnly) {
    assert.equal(svc.bind, '127.0.0.1', `${svc.id} must bind 127.0.0.1`);
    assert.equal(svc.host, '127.0.0.1', `${svc.id} must have host 127.0.0.1`);
  }
});

test('OmniRoute 20128 binds 192.168.0.15 and lan-guarded services + fleet-status 9165 are present', () => {
  const omni = getService('omniroute');
  assert.equal(omni.node, 't5500');
  assert.equal(omni.port, 20128);
  assert.equal(omni.bind, '192.168.0.15');
  assert.equal(getServiceUrl('omniroute', '/v1/models'), 'http://192.168.0.15:20128/v1/models');

  const guardedIds = [
    'swarm-command',
    'free-claude-code',
    'hermes-leadgen',
    'panda-router',
    'dream-engine',
    'alienware-obsidian-mcp',
    'mission-os',
    'hermes-api',
    'alienware-ollama',
    't5500-ollama',
  ];
  for (const id of guardedIds) {
    const svc = getService(id);
    assert.equal(svc.scope, 'lan-guarded', `${id} must be lan-guarded`);
    assert.equal(svc.bind, '0.0.0.0', `${id} must bind 0.0.0.0`);
    assert.ok(svc.authTokenEnv && svc.authTokenEnv.length > 0, `${id} must declare authTokenEnv`);
  }

  const awStatus = getService('alienware-fleet-status');
  assert.equal(awStatus.node, 'alienware');
  assert.equal(awStatus.port, 9165);
  assert.equal(awStatus.host, '192.168.0.40');

  const t5Status = getService('t5500-fleet-status');
  assert.equal(t5Status.node, 't5500');
  assert.equal(t5Status.port, 9165);
  assert.equal(t5Status.host, '192.168.0.15');
});

test('ESM and CJS loaders return identical results', () => {
  assert.deepEqual(cjsFleet.loadFleetMap(), loadFleetMap());
  assert.equal(cjsFleet.getNodeHost('alienware'), getNodeHost('alienware'));
  assert.equal(cjsFleet.getNodeHost('t5500'), getNodeHost('t5500'));
  assert.equal(cjsFleet.getServiceBindHost('dream-engine'), '0.0.0.0');
  assert.equal(cjsFleet.getServiceBindHost('dream-engine', '127.0.0.1'), '127.0.0.1');
  assert.equal(cjsFleet.getServicePort('dream-engine'), 9180);
  assert.equal(cjsFleet.getServiceUrl('panda-router', '/route'), 'http://192.168.0.40:8765/route');
  assert.equal(cjsFleet.getServiceHealthUrl('live-npc-lab'), 'http://192.168.0.40:9127/health');
  assert.equal(getNode('alienware').ip, '192.168.0.40');
  assert.ok(getServicesByNode('alienware').length >= 10);
});

test('copy-fleet-map.mjs defaults to [DRY RUN] and copies byte-identically with apply: true', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fleet-map-copy-'));
  try {
    const dest = path.join(tmpDir, 'ops', 'fleet', 'fleet-map.json');
    const dry = copyFleetMap({ targets: [dest], apply: false });
    assert.equal(dry.apply, false);
    assert.equal(fs.existsSync(dest), false);
    assert.match(dry.results[0].message, /\[DRY RUN\]/);

    const applied = copyFleetMap({ targets: [dest], apply: true });
    assert.equal(applied.apply, true);
    assert.equal(fs.existsSync(dest), true);
    assert.deepEqual(fs.readFileSync(dest), fs.readFileSync(FLEET_MAP_PATH));
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('PowerShell fleet scripts print [DRY RUN] by default without modifying the machine', () => {
  for (const scriptName of [
    'firewall-allowlist.ps1',
    'tunnel-targets.ps1',
    'configure-lan-binds.ps1',
    'remove-yt-dlp.ps1',
  ]) {
    const scriptPath = path.join(__dirname, scriptName);
    const res = spawnSync(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath],
      { encoding: 'utf8' }
    );
    assert.equal(res.status, 0, `${scriptName} failed: ${res.stderr}`);
    assert.match(res.stdout, /\[DRY RUN\]/, `${scriptName} must print [DRY RUN] by default`);
  }
});

test('docs/house/ADDRESS-DOCTRINE.md exists and documents 192.168.0.XX:XXXX, fleet-map.json, lan-guarded, and 127.0.0.1 exceptions', () => {
  const docPath = path.join(REPO_ROOT, 'docs', 'house', 'ADDRESS-DOCTRINE.md');
  const text = fs.readFileSync(docPath, 'utf8');
  assert.match(text, /192\.168\.0\.40/);
  assert.match(text, /192\.168\.0\.15/);
  assert.match(text, /ops\/fleet\/fleet-map\.json/);
  assert.match(text, /lan-guarded/);
  assert.match(text, /5432/);
  assert.match(text, /6379/);
  assert.match(text, /27123/);
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(text));
  assert.ok(!text.includes(FORBIDDEN_OLD_IP));
  assert.ok(!text.includes(LOOPBACK_HOST + ':8000'));
});
