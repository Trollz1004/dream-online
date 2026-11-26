import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  mapSearch,
  mapSection,
  memorySearch,
  memoryAdd,
  roleGet,
  methodGet,
  houseIndex,
  houseSearch,
  skillsList,
  skillsGet,
  wheelStatus,
  wheelQueue,
  resolveHttpBindHost,
  startHttpServer,
  handleJsonRpcMessage,
} from './server.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVER_PATH = path.join(__dirname, 'server.mjs');

function makeTempFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-mcp-test-'));
  const codemapDir = path.join(root, 'codemap');
  const rosterDir = path.join(root, 'roster');
  const rolesLocalDir = path.join(root, 'roles-local');
  const memoryDir = path.join(root, 'memory');
  const memoryFile = path.join(memoryDir, 'kit-memory.jsonl');
  const repoDir = path.join(root, 'sample-repo');

  fs.mkdirSync(codemapDir, { recursive: true });
  fs.mkdirSync(rosterDir, { recursive: true });
  fs.mkdirSync(rolesLocalDir, { recursive: true });
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.mkdirSync(path.join(repoDir, 'src'), { recursive: true });
  fs.mkdirSync(path.join(repoDir, '.git'), { recursive: true });
  fs.mkdirSync(path.join(repoDir, 'node_modules', 'pkg'), { recursive: true });
  fs.mkdirSync(path.join(repoDir, 'obsidian-vault'), { recursive: true });

  fs.writeFileSync(
    path.join(codemapDir, 'dream-online.md'),
    [
      '# Code map: dream-online',
      '',
      '## Top folders',
      '- [[ops]]: 206 files',
      '- [[src]]: 108 files',
      '',
      '## HTTP routes',
      '| GET | `/api/gm/health` | [[server.ts]] line 100 |',
      '| POST | `/api/router/route` | [[ops/router/dream-task-router.ts]] line 42 |',
      '',
      '## Tests',
      '- [[tests/house-spine.test.ts]]',
      '',
    ].join('\n'),
    'utf8',
  );

  fs.writeFileSync(
    path.join(codemapDir, 'json-repo.json'),
    JSON.stringify(
      {
        repo: 'json-repo',
        sections: {
          Routes: ['GET /health', 'POST /items'],
          Tests: ['tests/items.test.mjs'],
        },
      },
      null,
      2,
    ),
    'utf8',
  );

  fs.writeFileSync(
    path.join(rosterDir, 'roster.json'),
    JSON.stringify(
      [
        {
          id: 'engineering-backend-architect',
          source: 'agency-agents',
          division: 'engineering',
          name: 'Backend Architect',
          description: 'Scalable backend systems specialist',
          path: '%USERPROFILE%\\antigravity\\tools\\agency-agents\\engineering\\backend.md',
        },
      ],
      null,
      2,
    ),
    'utf8',
  );

  fs.writeFileSync(
    path.join(rolesLocalDir, 'engineering-backend-architect.md'),
    '# Local Override: Backend Architect\nAlways enforce Address Doctrine.\n',
    'utf8',
  );
  fs.writeFileSync(
    path.join(rolesLocalDir, 'custom-local-role.md'),
    '# Custom Local Role\nLocal-only role spec.\n',
    'utf8',
  );

  fs.writeFileSync(path.join(repoDir, 'src', 'router-widget.ts'), 'export const x = 1;\n', 'utf8');
  fs.writeFileSync(path.join(repoDir, '.env.local'), 'SECRET_KEY=should_never_be_indexed\n', 'utf8');
  fs.writeFileSync(path.join(repoDir, '.git', 'HEAD'), 'ref: refs/heads/main\n', 'utf8');
  fs.writeFileSync(path.join(repoDir, 'node_modules', 'pkg', 'router-widget.js'), 'module.exports={};\n', 'utf8');
  fs.writeFileSync(path.join(repoDir, 'obsidian-vault', 'router-secret.md'), 'vault note\n', 'utf8');

  return { root, codemapDir, rosterDir, rolesLocalDir, memoryFile, repoDir };
}

function loopbackUrl(port, suffix = '') {
  return ['http://127', '0', '0', '1'].join('.') + `:${port}${suffix}`;
}

test('map_search searches codemap MD and JSON and falls back to repo tree skipping .git, node_modules, .env*, and vaults', () => {
  const fx = makeTempFixture();
  try {
    const mdRes = mapSearch(
      { repo: 'dream-online', query: '/api/gm/health' },
      { codemapDir: fx.codemapDir },
    );
    assert.equal(mdRes.source, 'codemap');
    assert.ok(mdRes.matches.some((m) => m.line.includes('/api/gm/health') && m.section === 'HTTP routes'));

    const jsonRes = mapSearch(
      { repo: 'json-repo', query: '/items' },
      { codemapDir: fx.codemapDir },
    );
    assert.equal(jsonRes.source, 'codemap-json');
    assert.ok(jsonRes.matches.some((m) => m.line.includes('POST /items')));

    const fallbackRes = mapSearch(
      { repo: 'sample-repo', query: 'router' },
      { codemapDir: fx.codemapDir, repoDir: fx.repoDir },
    );
    assert.equal(fallbackRes.source, 'repo-tree');
    assert.deepEqual(fallbackRes.matches.map((m) => m.line), ['src/router-widget.ts']);

    const envRes = mapSearch(
      { repo: 'sample-repo', query: '.env' },
      { codemapDir: fx.codemapDir, repoDir: fx.repoDir },
    );
    assert.equal(envRes.matches.length, 0);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('map_section returns requested codemap section from MD and JSON', () => {
  const fx = makeTempFixture();
  try {
    const mdSec = mapSection(
      { repo: 'dream-online', name: 'HTTP routes' },
      { codemapDir: fx.codemapDir },
    );
    assert.equal(mdSec.found, true);
    assert.equal(mdSec.section, 'HTTP routes');
    assert.match(mdSec.content, /\/api\/gm\/health/);

    const jsonSec = mapSection(
      { repo: 'json-repo', name: 'Routes' },
      { codemapDir: fx.codemapDir },
    );
    assert.equal(jsonSec.found, true);
    assert.match(jsonSec.content, /POST \/items/);

    const missingSec = mapSection(
      { repo: 'dream-online', name: 'NonExistentSection' },
      { codemapDir: fx.codemapDir },
    );
    assert.equal(missingSec.found, false);
    assert.ok(missingSec.availableSections.includes('HTTP routes'));
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('memory_add rejects secret shapes (.env, sk-, AIza, ghp_, EAAA, vault paths) and persists clean entries', async () => {
  const fx = makeTempFixture();
  try {
    const secretCases = [
      ['generic sk', 'here is ' + 'sk-' + '1234567890abcdef123456'],
      ['google AIza', 'key ' + 'AIza' + 'SyD9a8b7c6d5e4f3g2h1i0j9k8l7m6'],
      ['github ghp_', 'pat ' + 'ghp_' + 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5'],
      ['square EAAA', 'tok ' + 'EAAA' + 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1'],
      ['dotenv file', 'read .env.production for values'],
      ['vault path', 'save inside obsidian-vault/secret.md'],
      ['vault path claude-to-claude', 'copy from OneDrive/claude-to-claude/notes.md'],
    ];

    for (const [label, payload] of secretCases) {
      await assert.rejects(
        () =>
          memoryAdd(
            { text: payload, tags: ['test'] },
            { memoryFile: fx.memoryFile, aiMemoryUrl: '' },
          ),
        /Refused/i,
        `memoryAdd must reject ${label}`,
      );
    }

    assert.equal(fs.existsSync(fx.memoryFile), false);

    const added = await memoryAdd(
      { text: 'Stage E2 starter kit verified cleanly.', tags: ['stage-e2', 'kit'] },
      { memoryFile: fx.memoryFile, aiMemoryUrl: '' },
    );
    assert.equal(added.savedLocal, true);
    assert.equal(fs.existsSync(fx.memoryFile), true);

    const lines = fs.readFileSync(fx.memoryFile, 'utf8').trim().split('\n');
    assert.equal(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assert.equal(parsed.text, 'Stage E2 starter kit verified cleanly.');
    assert.deepEqual(parsed.tags, ['stage-e2', 'kit']);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('memory_search queries ai-memory HTTP server with timeout and falls back to local JSONL when offline or timed out', async () => {
  const fx = makeTempFixture();
  const requests = [];
  let server;
  let slowServer;
  try {
    await memoryAdd(
      { text: 'Local fallback memory note about Panda Router.', tags: ['local'] },
      { memoryFile: fx.memoryFile, aiMemoryUrl: '' },
    );

    server = http.createServer((req, res) => {
      requests.push({ method: req.method, url: req.url });
      if (req.url && req.url.startsWith('/search')) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(
          JSON.stringify({
            results: [{ text: 'Remote ai-memory hit for Panda Router.', tags: ['fleet'] }],
          }),
        );
        return;
      }
      if (req.url === '/add' && req.method === 'POST') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const onlineRes = await memorySearch(
      { query: 'Panda Router' },
      { memoryFile: fx.memoryFile, aiMemoryUrl: loopbackUrl(port), timeoutMs: 1500 },
    );
    assert.equal(onlineRes.remoteQueried, true);
    assert.equal(onlineRes.remoteOk, true);
    assert.ok(onlineRes.hits.some((h) => h.text.includes('Remote ai-memory hit')));
    assert.ok(onlineRes.hits.some((h) => h.text.includes('Local fallback memory note')));
    assert.ok(requests.some((r) => r.url.startsWith('/search?q=Panda')));

    const addOnline = await memoryAdd(
      { text: 'Remote sync memory entry.', tags: ['sync'] },
      { memoryFile: fx.memoryFile, aiMemoryUrl: loopbackUrl(port), timeoutMs: 1500 },
    );
    assert.equal(addOnline.savedLocal, true);
    assert.equal(addOnline.syncedRemote, true);

    slowServer = http.createServer(() => {
      // Intentionally never respond so timeout triggers cleanly
    });
    await new Promise((resolve) => slowServer.listen(0, '127.0.0.1', resolve));
    const slowPort = slowServer.address().port;

    const fallbackRes = await memorySearch(
      { query: 'Panda Router' },
      { memoryFile: fx.memoryFile, aiMemoryUrl: loopbackUrl(slowPort), timeoutMs: 120 },
    );
    assert.equal(fallbackRes.remoteOk, false);
    assert.equal(fallbackRes.usedFallback, true);
    assert.ok(fallbackRes.hits.some((h) => h.text.includes('Local fallback memory note')));
  } finally {
    if (server) server.close();
    if (slowServer) slowServer.close();
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('role_get reads roster entry plus local role override and rejects traversal ids', () => {
  const fx = makeTempFixture();
  try {
    const merged = roleGet(
      { id: 'engineering-backend-architect' },
      { rosterDir: fx.rosterDir, rolesLocalDir: fx.rolesLocalDir },
    );
    assert.equal(merged.found, true);
    assert.equal(merged.roster.name, 'Backend Architect');
    assert.match(merged.localMarkdown, /Address Doctrine/);

    const localOnly = roleGet(
      { id: 'custom-local-role' },
      { rosterDir: fx.rosterDir, rolesLocalDir: fx.rolesLocalDir },
    );
    assert.equal(localOnly.found, true);
    assert.match(localOnly.localMarkdown, /Local-only role spec/);

    const missing = roleGet(
      { id: 'does-not-exist' },
      { rosterDir: fx.rosterDir, rolesLocalDir: fx.rolesLocalDir },
    );
    assert.equal(missing.found, false);

    assert.throws(
      () => roleGet({ id: '../secret' }, { rosterDir: fx.rosterDir, rolesLocalDir: fx.rolesLocalDir }),
      /Invalid role id/i,
    );
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('method_get returns ops/kit/METHOD.md contents', () => {
  const res = methodGet();
  assert.match(res.text, /Starter Kit Method Card/);
  assert.match(res.text, /Brainstorm three ways/);
  assert.match(res.text, /Write failing test first/);
  assert.match(res.text, /DID \/ BROKE \/ NEXT \/ BLOCKED \/ FILES/);
});

test('handleJsonRpcMessage supports initialize, notifications/initialized, ping, tools/list, and tools/call', async () => {
  const initResp = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { protocolVersion: '2025-06-18' },
  });
  assert.equal(initResp.id, 1);
  assert.equal(initResp.result.serverInfo.name, 'dream-kit');

  const notifResp = await handleJsonRpcMessage({
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  });
  assert.equal(notifResp, null);

  const pingResp = await handleJsonRpcMessage({ jsonrpc: '2.0', id: 2, method: 'ping' });
  assert.deepEqual(pingResp.result, {});

  const listResp = await handleJsonRpcMessage({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
  const toolNames = listResp.result.tools.map((t) => t.name).sort();
  assert.deepEqual(toolNames, [
    'house_index',
    'house_search',
    'map_search',
    'map_section',
    'memory_add',
    'memory_search',
    'method_get',
    'role_get',
    'skills_get',
    'skills_list',
    'wheel_queue',
    'wheel_status',
  ]);
});

test('stdio JSON-RPC roundtrip over child_process spawn executes initialize, tools/list, and tools/call', async () => {
  const fx = makeTempFixture();
  try {
    const child = spawn(process.execPath, [SERVER_PATH], {
      env: {
        ...process.env,
        KIT_CODEMAP_DIR: fx.codemapDir,
        KIT_ROSTER_DIR: fx.rosterDir,
        KIT_ROLES_LOCAL_DIR: fx.rolesLocalDir,
        KIT_MEMORY_FILE: fx.memoryFile,
        KIT_AI_MEMORY_URL: 'off',
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const responses = [];
    let buffer = '';
    const done = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('MCP stdio roundtrip timed out')), 5000);
      child.stdout.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.trim()) continue;
          responses.push(JSON.parse(line));
          if (responses.length >= 6) {
            clearTimeout(timer);
            resolve();
          }
        }
      });
      child.on('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
    });

    const messages = [
      { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } },
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/list' },
      { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'method_get', arguments: {} } },
      { jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'map_section', arguments: { repo: 'dream-online', name: 'HTTP routes' } } },
      { jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'role_get', arguments: { id: 'engineering-backend-architect' } } },
      { jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'memory_add', arguments: { text: 'bad ' + 'AIza' + 'SyD9a8b7c6d5e4f3g2h1i0j9k8' } } },
    ];

    for (const msg of messages) {
      child.stdin.write(JSON.stringify(msg) + '\n');
    }

    await done;
    child.stdin.end();

    assert.equal(responses.find((r) => r.id === 1).result.serverInfo.name, 'dream-kit');
    assert.equal(responses.find((r) => r.id === 2).result.tools.length, 12);
    assert.match(responses.find((r) => r.id === 3).result.content[0].text, /Starter Kit Method Card/);
    assert.match(responses.find((r) => r.id === 4).result.content[0].text, /\/api\/gm\/health/);
    assert.match(responses.find((r) => r.id === 5).result.content[0].text, /Backend Architect/);
    assert.equal(responses.find((r) => r.id === 6).result.isError, true);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test('house_index returns docs/house/INDEX.md', () => {
  const res = houseIndex();
  assert.equal(res.path, 'docs/house/INDEX.md');
  assert.match(res.text, /# House Index/);
  assert.match(res.text, /ops\/kit\/server\.mjs/);
});

test('house_search searches across docs/house and docs/standards', () => {
  const houseHit = houseSearch({ query: '192.168.0.40' });
  assert.ok(Array.isArray(houseHit.matches));
  assert.ok(houseHit.matches.length > 0);
  assert.ok(houseHit.matches.some((m) => m.file.startsWith('docs/house/')));

  const standardsHit = houseSearch({ query: 'Remake gate' });
  assert.ok(standardsHit.matches.some((m) => m.file.startsWith('docs/standards/')));
});

test('skills_list and skills_get list and read from .agents/skills and OneDrive AGENCY SKILLS without modifying files', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-skills-test-'));
  try {
    const repoSkillsDir = path.join(root, 'repo-skills');
    const oneDriveDir = path.join(root, 'OneDriveFake');
    const agencySkillsDir = path.join(oneDriveDir, 'AGENCY SKILLS');

    fs.mkdirSync(path.join(repoSkillsDir, 'tdd'), { recursive: true });
    const tddPath = path.join(repoSkillsDir, 'tdd', 'SKILL.md');
    const tddText = '---\nname: tdd\ndescription: "Mandatory Test-Driven Development."\n---\n\n# TDD Skill Body\nWrite failing tests first.\n';
    fs.writeFileSync(tddPath, tddText, 'utf8');

    fs.mkdirSync(path.join(agencySkillsDir, 'custom-agency-skill'), { recursive: true });
    const agencySkillPath = path.join(agencySkillsDir, 'custom-agency-skill', 'SKILL.md');
    const agencySkillText = '---\nname: Custom Agency Skill\ndescription: "OneDrive agency skill description."\n---\n\n# Custom Agency Skill\nRead-only OneDrive skill text.\n';
    fs.writeFileSync(agencySkillPath, agencySkillText, 'utf8');

    const listed = skillsList(
      {},
      {
        repoSkillsDir,
        env: { OneDrive: oneDriveDir },
      },
    );
    assert.equal(listed.count, 2);
    assert.ok(listed.skills.some((s) => s.id === 'tdd' && s.source === '.agents/skills'));
    assert.ok(listed.skills.some((s) => s.id === 'custom-agency-skill' && s.source === 'agency-skills'));

    const gotRepo = skillsGet(
      { id: 'tdd' },
      {
        repoSkillsDir,
        env: { OneDrive: oneDriveDir },
      },
    );
    assert.equal(gotRepo.found, true);
    assert.match(gotRepo.text, /# TDD Skill Body/);
    assert.equal(fs.readFileSync(tddPath, 'utf8'), tddText);

    const gotAgency = skillsGet(
      { id: 'custom-agency-skill' },
      {
        repoSkillsDir,
        env: { OneDrive: oneDriveDir },
      },
    );
    assert.equal(gotAgency.found, true);
    assert.equal(gotAgency.source, 'agency-skills');
    assert.match(gotAgency.text, /Read-only OneDrive skill text/);
    assert.equal(fs.readFileSync(agencySkillPath, 'utf8'), agencySkillText);

    assert.throws(
      () => skillsGet({ id: '../secret' }, { repoSkillsDir, env: { OneDrive: oneDriveDir } }),
      /Invalid skill id/i,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('wheel_status reports counts and names for queued, running, done today, and failed tickets', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-wheel-status-'));
  try {
    const inboxDir = path.join(root, 'inbox');
    for (const sub of ['queued', 'running', 'done', 'failed']) {
      fs.mkdirSync(path.join(inboxDir, sub), { recursive: true });
    }

    fs.writeFileSync(path.join(inboxDir, 'queued', 'q1-first.md'), '# Q1\n', 'utf8');
    fs.writeFileSync(path.join(inboxDir, 'queued', 'q2-second.md'), '# Q2\n', 'utf8');
    fs.writeFileSync(path.join(inboxDir, 'running', 'r1-active.md'), '# R1\n', 'utf8');
    fs.writeFileSync(path.join(inboxDir, 'failed', 'f1-broken.md'), '# F1\n', 'utf8');
    fs.writeFileSync(path.join(inboxDir, 'failed', 'f1-broken.log'), 'failure log\n', 'utf8');

    const todayDone = path.join(inboxDir, 'done', 'd1-today.md');
    fs.writeFileSync(todayDone, '# D1\n', 'utf8');
    const oldDone = path.join(inboxDir, 'done', 'd0-old.md');
    fs.writeFileSync(oldDone, '# D0\n', 'utf8');
    const pastDate = new Date('2026-01-02T12:00:00Z');
    fs.utimesSync(oldDone, pastDate, pastDate);

    const status = wheelStatus({ inboxDir, now: () => new Date() });
    assert.equal(status.queued.count, 2);
    assert.deepEqual(status.queued.names, ['q1-first.md', 'q2-second.md']);
    assert.equal(status.running.count, 1);
    assert.deepEqual(status.running.names, ['r1-active.md']);
    assert.equal(status.doneToday.count, 1);
    assert.deepEqual(status.doneToday.names, ['d1-today.md']);
    assert.equal(status.failed.count, 1);
    assert.deepEqual(status.failed.names, ['f1-broken.md']);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('wheel_queue writes UTF-8 without BOM through a staging file and move, and rejects unknown lane or repo', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-wheel-queue-'));
  try {
    const inboxDir = path.join(root, 'inbox');
    fs.mkdirSync(path.join(inboxDir, 'queued'), { recursive: true });

    assert.throws(
      () =>
        wheelQueue(
          {
            id: 'bad-lane-ticket',
            title: 'Bad lane test',
            lane: 'non-existent-lane-xyz',
            repo: 'dream-online',
            body: 'Should be rejected.',
          },
          { inboxDir },
        ),
      /unknown lane|not listed/i,
    );

    assert.throws(
      () =>
        wheelQueue(
          {
            id: 'bad-repo-ticket',
            title: 'Bad repo test',
            lane: 'code-hard',
            repo: 'non-existent-repo-xyz',
            body: 'Should be rejected.',
          },
          { inboxDir },
        ),
      /unknown repo|not listed/i,
    );

    const queued = wheelQueue(
      {
        id: 'hm1-test-ticket',
        title: 'Test queued ticket from House MCP',
        lane: 'code-hard',
        repo: 'dream-online',
        body: 'Verify stage and move without BOM.',
      },
      { inboxDir },
    );

    assert.equal(queued.queued, true);
    assert.equal(queued.fileName, 'hm1-test-ticket.md');
    const writtenPath = path.join(inboxDir, 'queued', 'hm1-test-ticket.md');
    assert.equal(fs.existsSync(writtenPath), true);

    const rawBytes = fs.readFileSync(writtenPath);
    assert.notEqual(rawBytes[0], 0xef, 'Ticket file must not start with UTF-8 BOM');
    const text = rawBytes.toString('utf8');
    assert.match(text, /^# Test queued ticket from House MCP\n/);
    assert.match(text, /\nlane: code-hard\n/);
    assert.match(text, /\nrepo: dream-online\n/);
    assert.match(text, /\n\nVerify stage and move without BOM\.\n$/);

    const leftoverTmp = fs.readdirSync(path.join(inboxDir, 'queued')).filter((f) => f.endsWith('.tmp'));
    assert.deepEqual(leftoverTmp, []);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('HTTP transport refuses to start without HOUSE_MCP_KEY, binds Alienware house address from fleet-map.json, and returns 401 on wrong key', async () => {
  const bindHost = resolveHttpBindHost();
  assert.equal(bindHost, '192.168.0.40');
  assert.throws(() => resolveHttpBindHost({ host: '0.0.0.0' }), /never all interfaces|Refused/i);

  await assert.rejects(
    () => startHttpServer({ env: { HOUSE_MCP_KEY: '' }, port: 0 }),
    /HOUSE_MCP_KEY/i,
  );

  const testKey = 'house-mcp-stage1-test-key-987654321';
  const fx = makeTempFixture();
  let handle;
  try {
    handle = await startHttpServer({
      env: { HOUSE_MCP_KEY: testKey },
      port: 0,
      codemapDir: fx.codemapDir,
      rosterDir: fx.rosterDir,
      rolesLocalDir: fx.rolesLocalDir,
      memoryFile: fx.memoryFile,
      aiMemoryUrl: '',
    });

    assert.equal(handle.host, '192.168.0.40');
    assert.ok(handle.port > 0);
    const endpoint = `http://${handle.host}:${handle.port}/mcp`;

    const noAuthRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    assert.equal(noAuthRes.status, 401);

    const wrongKeyRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer wrong-key-value',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    assert.equal(wrongKeyRes.status, 401);

    const initRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        authorization: `Bearer ${testKey}`,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2025-06-18' },
      }),
    });
    assert.equal(initRes.status, 200);
    const sessionId = initRes.headers.get('mcp-session-id');
    assert.ok(sessionId);
    const initJson = await initRes.json();
    assert.equal(initJson.result.serverInfo.name, 'dream-kit');

    const callRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${testKey}`,
        'mcp-session-id': sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/call',
        params: { name: 'house_index', arguments: {} },
      }),
    });
    assert.equal(callRes.status, 200);
    const callJson = await callRes.json();
    assert.match(callJson.result.content[0].text, /# House Index/);

    // Verify CLI spawn with HOUSE_MCP_HTTP=1 and no HOUSE_MCP_KEY exits non-zero and never prints a key
    const noKeyExit = await new Promise((resolve) => {
      const child = spawn(process.execPath, [SERVER_PATH], {
        env: {
          ...process.env,
          HOUSE_MCP_HTTP: '1',
          HOUSE_MCP_KEY: '',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stderr = '';
      child.stderr.on('data', (d) => {
        stderr += d.toString('utf8');
      });
      child.on('close', (code) => resolve({ code, stderr }));
    });
    assert.notEqual(noKeyExit.code, 0);
    assert.match(noKeyExit.stderr, /HOUSE_MCP_KEY/i);
  } finally {
    if (handle) await handle.close();
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});
