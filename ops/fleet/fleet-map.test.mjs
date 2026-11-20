import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import * as esmFleet from './fleet-map.mjs';
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
  'address',
  'port',
  'protocol',
  'scope',
  'bind',
  'authTokenEnv',
  'healthPath',
  'expectedIdentity',
  'ownerLane',
  'ownerTask',
  'ownerTaskName',
  'status',
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
    assert.equal(svc.host, getNodeHost(svc.node), `${svc.id} must have node 192.168.0.x host`);
    assert.equal(svc.address, getNodeHost(svc.node), `${svc.id} must have node 192.168.0.x address`);
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

test('Stage E1: fleet-map.json includes spine and githubAccount/repos/harnesses on alienware and t5500', () => {
  const map = loadFleetMap();
  assert.equal(map.spine, 'docs/house/SPINE.md');

  const expectedAlienwareRepos = [
    'Trollz1004/dream-online',
    'Trollz1004/swarm-command',
    'Trollz1004/ANTIGRAVITY',
  ];
  const expectedT5500Repos = [
    'Trollz1004/ANTIGRAVITY',
    'Trollz1004/dream-online',
  ];
  const expectedAlienwareHarnesses = [
    'agy',
    'claude-code',
    'codex',
    'gemini',
    'hermes',
    'openclaw',
    'freebuff',
    'free-claude-code',
  ];
  const expectedT5500Harnesses = [
    'agy',
    'claude-code',
    'codex',
    'gemini',
    'hermes',
    'openclaw',
    'omniroute',
  ];

  const aw = getNode('alienware');
  assert.equal(aw.name, 'Alienware');
  assert.equal(aw.host, '192.168.0.40');
  assert.equal(aw.ip, '192.168.0.40');
  assert.equal(aw.role, 'workshop');
  assert.equal(aw.githubAccount, 'Trollz1004');
  assert.deepEqual(aw.repos, expectedAlienwareRepos);
  assert.deepEqual(aw.harnesses, expectedAlienwareHarnesses);

  const t5 = getNode('t5500');
  assert.equal(t5.name, 'T5500');
  assert.equal(t5.host, '192.168.0.15');
  assert.equal(t5.ip, '192.168.0.15');
  assert.equal(t5.role, 'front-of-house');
  assert.equal(t5.githubAccount, 'Trollz1004');
  assert.deepEqual(t5.repos, expectedT5500Repos);
  assert.deepEqual(t5.harnesses, expectedT5500Harnesses);
});

test('Stage E1: ESM and CJS loaders export getSpinePath, getNodeRepos, getNodeHarnesses and snake_case aliases', () => {
  assert.equal(typeof esmFleet.getSpinePath, 'function', 'ESM must export getSpinePath');
  assert.equal(typeof esmFleet.getNodeRepos, 'function', 'ESM must export getNodeRepos');
  assert.equal(typeof esmFleet.getNodeHarnesses, 'function', 'ESM must export getNodeHarnesses');
  assert.equal(typeof esmFleet.get_spine_path, 'function', 'ESM must export get_spine_path');
  assert.equal(typeof esmFleet.get_node_repos, 'function', 'ESM must export get_node_repos');
  assert.equal(typeof esmFleet.get_node_harnesses, 'function', 'ESM must export get_node_harnesses');

  assert.equal(typeof cjsFleet.getSpinePath, 'function', 'CJS must export getSpinePath');
  assert.equal(typeof cjsFleet.getNodeRepos, 'function', 'CJS must export getNodeRepos');
  assert.equal(typeof cjsFleet.getNodeHarnesses, 'function', 'CJS must export getNodeHarnesses');
  assert.equal(typeof cjsFleet.get_spine_path, 'function', 'CJS must export get_spine_path');
  assert.equal(typeof cjsFleet.get_node_repos, 'function', 'CJS must export get_node_repos');
  assert.equal(typeof cjsFleet.get_node_harnesses, 'function', 'CJS must export get_node_harnesses');

  assert.equal(esmFleet.getSpinePath(), 'docs/house/SPINE.md');
  assert.equal(cjsFleet.getSpinePath(), 'docs/house/SPINE.md');
  assert.equal(esmFleet.get_spine_path(), 'docs/house/SPINE.md');
  assert.equal(cjsFleet.get_spine_path(), 'docs/house/SPINE.md');

  assert.deepEqual(esmFleet.getNodeRepos('alienware'), [
    'Trollz1004/dream-online',
    'Trollz1004/swarm-command',
    'Trollz1004/ANTIGRAVITY',
  ]);
  assert.deepEqual(cjsFleet.getNodeRepos('alienware'), esmFleet.getNodeRepos('alienware'));
  assert.deepEqual(esmFleet.getNodeRepos('t5500'), [
    'Trollz1004/ANTIGRAVITY',
    'Trollz1004/dream-online',
  ]);
  assert.deepEqual(cjsFleet.get_node_repos('t5500'), esmFleet.get_node_repos('t5500'));

  assert.deepEqual(esmFleet.getNodeHarnesses('alienware'), [
    'agy',
    'claude-code',
    'codex',
    'gemini',
    'hermes',
    'openclaw',
    'freebuff',
    'free-claude-code',
  ]);
  assert.deepEqual(cjsFleet.getNodeHarnesses('alienware'), esmFleet.getNodeHarnesses('alienware'));
  assert.deepEqual(esmFleet.getNodeHarnesses('t5500'), [
    'agy',
    'claude-code',
    'codex',
    'gemini',
    'hermes',
    'openclaw',
    'omniroute',
  ]);
  assert.deepEqual(cjsFleet.get_node_harnesses('t5500'), esmFleet.get_node_harnesses('t5500'));

  // Defensive copy check: mutating returned arrays must not mutate cached map
  const reposCopy = esmFleet.getNodeRepos('alienware');
  reposCopy.push('mutated/repo');
  assert.equal(esmFleet.getNodeRepos('alienware').includes('mutated/repo'), false);

  assert.throws(() => esmFleet.getNodeRepos('unknown-node'), /Unknown fleet node/);
  assert.throws(() => cjsFleet.getNodeHarnesses('unknown-node'), /Unknown fleet node/);
});

test('loader test: every service in fleet-map.json has node, 192.168.0.x address, port, owner task name, and unconfirmed 2026-11-20 markers', () => {
  const map = loadFleetMap();
  assert.equal(map.updated, '2026-11-20');
  assert.equal(map.services.length, 31, 'all 31 existing services must be retained without deletion');

  const forbiddenEntryRe = /sabretooth|sabertooth|grin-droid|grindroid|mira|trolly/i;
  for (const svc of map.services) {
    assert.ok(!forbiddenEntryRe.test(svc.id) && !forbiddenEntryRe.test(svc.name), `forbidden entry ${svc.id}`);
    assert.ok(svc.node === 'alienware' || svc.node === 't5500', `${svc.id} must declare valid node`);

    const expectedIp = svc.node === 'alienware' ? '192.168.0.40' : '192.168.0.15';
    assert.equal(svc.host, expectedIp, `${svc.id} host must be ${expectedIp}, never localhost or loopback`);
    assert.equal(svc.address, expectedIp, `${svc.id} address must be ${expectedIp}, never localhost or loopback`);
    assert.match(svc.address, /^192\.168\.0\.(40|15)$/, `${svc.id} address must be 192.168.0.40 or 192.168.0.15`);

    assert.equal(typeof svc.port, 'number', `${svc.id} port must be a number`);
    assert.ok(Number.isInteger(svc.port) && svc.port > 0 && svc.port <= 65535, `${svc.id} port must be valid TCP port`);

    assert.equal(typeof svc.ownerTask, 'string', `${svc.id} must have ownerTask string`);
    assert.ok(svc.ownerTask.trim().length > 0, `${svc.id} ownerTask must be non-empty`);
    assert.equal(typeof svc.ownerTaskName, 'string', `${svc.id} must have ownerTaskName string`);
    assert.equal(svc.ownerTaskName, svc.ownerTask, `${svc.id} ownerTaskName must match ownerTask`);

    assert.ok(
      svc.status === 'confirmed' || svc.status === 'unconfirmed (2026-11-20)',
      `${svc.id} status must be confirmed or unconfirmed (2026-11-20), got "${svc.status}"`
    );
  }

  const expectedUnconfirmedIds = [
    'media-worker',
    'alienware-hermes-dashboard',
    'airi-dashboard',
    'alienware-fleet-status',
    'crosslisting',
    'alienware-ollama',
    'alienware-obsidian-rest',
    'alienware-obsidian-mcp',
    't5500-marketing-gateway',
    't5500-hermes-dashboard',
    't5500-live-npc-lab',
    't5500-fleet-status',
    'ai-memory',
    't5500-obsidian-rest',
  ];
  for (const id of expectedUnconfirmedIds) {
    const svc = getService(id);
    assert.equal(svc.status, 'unconfirmed (2026-11-20)', `${id} must be marked unconfirmed (2026-11-20)`);
    assert.equal(svc.unconfirmed, '2026-11-20', `${id} must carry unconfirmed date 2026-11-20`);
  }

  assert.equal(esmFleet.getServiceOwnerTask('dream-engine'), 'DREAM-Alienware-BootAll');
  assert.equal(cjsFleet.getServiceOwnerTask('panda-router'), 'DreamPandaRouter');
  assert.equal(esmFleet.get_service_owner_task('omniroute'), 'ANTIGRAVITY OmniRoute');
  assert.equal(cjsFleet.get_service_owner_task('date-app-web'), 'ANTIGRAVITY T5500 Keepalive');
});
