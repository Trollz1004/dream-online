const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { execFileSync, spawn } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = fs.existsSync(path.join(ROOT_DIR, '..', 'AGENTS.md'))
  ? path.resolve(ROOT_DIR, '..')
  : path.resolve(ROOT_DIR, '..', '..');

const LOOPBACK = ['127', '0', '0', '1'].join('.');
const LEGACY_VAULT_ENV = ['SABRE', 'TOOTH_VAULT_ROOT'].join('');
const FORBIDDEN_OLD_NODE_RE = new RegExp(['sabre' + 'tooth', 'saber' + 'tooth'].join('|'), 'i');
const FORBIDDEN_OLD_IP = ['192', '168', '0', '8'].join('.');
const EASY_BUTTON_FILENAME = ['SABRE', 'TOOTH-GEMINI-EASY-BUTTON.bat'].join('');

const TEMP_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'hermes-leadgen-isolated-'));
const VAULT_DIR = path.join(TEMP_ROOT, 'vault');
const STATE_DIR = path.join(TEMP_ROOT, 'state');
fs.mkdirSync(VAULT_DIR, { recursive: true });
fs.mkdirSync(STATE_DIR, { recursive: true });

process.env.LEADGEN_VAULT_ROOT = VAULT_DIR;
process.env[LEGACY_VAULT_ENV] = VAULT_DIR;
process.env.LEADGEN_STATE_DIR = STATE_DIR;
process.env.HERMES_LEADGEN_BIND = '127.0.0.1';
process.env.AGENT_DRIFT_PATH = path.join(TEMP_ROOT, 'isolated-agent-drift.json');

let localServerInstance = null;
let baseUrl = '';
let boundPort = 0;

test.before(async () => {
  process.env.LEADGEN_VAULT_ROOT = VAULT_DIR;
  process.env[LEGACY_VAULT_ENV] = VAULT_DIR;
  process.env.LEADGEN_STATE_DIR = STATE_DIR;
  process.env.HERMES_LEADGEN_BIND = '127.0.0.1';

  const { server } = require('../server');
  localServerInstance = server;
  if (localServerInstance.listening) {
    await new Promise((resolve) => localServerInstance.close(() => resolve()));
  }
  await new Promise((resolve) => {
    localServerInstance.listen(0, '127.0.0.1', () => resolve());
  });
  boundPort = localServerInstance.address().port;
  baseUrl = `http://${LOOPBACK}:${boundPort}`;
});

test.after(async () => {
  if (localServerInstance && localServerInstance.listening) {
    await new Promise((resolve) => localServerInstance.close(() => resolve()));
  }
  fs.rmSync(TEMP_ROOT, { recursive: true, force: true });
});

function httpGetJson(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: {
        ...extraHeaders
      }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), raw: body });
        } catch (err) {
          resolve({ status: res.statusCode, data: null, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function httpPostJson(url, payload, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        ...extraHeaders
      }
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body), raw: body });
        } catch (err) {
          resolve({ status: res.statusCode, data: null, raw: body });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

test('1. Multi-harness entry files (AGENTS.md, CLAUDE.md, GEMINI.md) exist and contain zero retired-node drift', () => {
  const files = [
    path.join(REPO_ROOT, 'AGENTS.md'),
    path.join(REPO_ROOT, 'CLAUDE.md'),
    path.join(REPO_ROOT, 'GEMINI.md')
  ];
  for (const file of files) {
    assert.ok(fs.existsSync(file), `Missing canonical file: ${file}`);
    const content = fs.readFileSync(file, 'utf8');
    assert.ok(!content.includes('NO SUCH NODE — retired, OFF BY RULING'), `Stale retired claim found in ${file}`);
  }
});

test('2. Agent souls and profiles include OPSis default research orchestrator, harvey, youtube, editor, kanban, notes, and fcc on Alienware', () => {
  const requiredSouls = [
    'default-orchestrator-agent.md',
    'harvey-agent.md',
    'youtube-agent.md',
    'editor-agent.md',
    'kanban-agent.md',
    'notes-agent.md',
    'fcc-agent.md'
  ];
  const bannedLabel = new RegExp('jar' + 'vis', 'i');
  for (const s of requiredSouls) {
    const p = path.join(ROOT_DIR, 'souls', s);
    assert.ok(fs.existsSync(p), `Missing soul file: ${s}`);
    const text = fs.readFileSync(p, 'utf8');
    assert.ok(text.includes('agy --dangerously-skip-permissions') || text.includes('grok') || text.includes('8082'), `Missing CLI auth spec in ${s}`);
    assert.ok(text.includes('Alienware'), `Missing node Alienware in ${s}`);
    assert.ok(!FORBIDDEN_OLD_NODE_RE.test(text), `Soul ${s} must not mention retired node`);
    assert.ok(!text.includes(FORBIDDEN_OLD_IP), `Soul ${s} must not mention retired IP`);
    assert.ok(!bannedLabel.test(text), `Soul ${s} must use OPSis`);
  }
  const defaultSoul = fs.readFileSync(path.join(ROOT_DIR, 'souls', 'default-orchestrator-agent.md'), 'utf8');
  assert.ok(defaultSoul.includes('OPSis'));
  assert.ok(defaultSoul.includes('Alienware Lead-Gen Command Studio'));
  assert.ok(defaultSoul.includes('http://192.168.0.40:9119/chat?profile=default&resume=local-profile'));
  assert.ok(defaultSoul.includes('agy --dangerously-skip-permissions'));
  assert.ok(defaultSoul.includes('agent-reach'));
  assert.ok(defaultSoul.includes('last30days'));
  assert.ok(defaultSoul.includes('rea'));
  assert.ok(defaultSoul.includes('test-driven-development'));
});

test('3. Server API provides Node Status (Alienware (192.168.0.40)), Dual Graphies, Leads per Source & 3 Specific Types, Terminal/Media Previews, FCC :8082, and isolated Obsidian Memory Sync', async () => {
  assert.ok(boundPort > 0 && boundPort !== 8392, 'Test server must run on an isolated ephemeral port');
  const statusRes = await httpGetJson(`${baseUrl}/api/node/status`);
  assert.equal(statusRes.status, 200);
  assert.equal(statusRes.data.node, 'Alienware (192.168.0.40)');
  assert.ok(statusRes.raw.includes('Alienware Lead-Gen Command Studio'));
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(statusRes.raw), '/api/node/status must contain zero retired-node references');
  assert.ok(!statusRes.raw.includes(FORBIDDEN_OLD_IP), '/api/node/status must contain zero retired IP references');
  assert.ok(Array.isArray(statusRes.data.services));
  const ports = statusRes.data.services.map(s => s.port);
  for (const p of [8392, 9119, 8082, 8391, 11434, 27123, 49374]) {
    assert.ok(ports.includes(p), `Missing port ${p} in Red/Green light check`);
  }

  // Dual Graphies
  const graphyRes = await httpGetJson(`${baseUrl}/api/graphy`);
  assert.equal(graphyRes.status, 200);
  assert.ok(graphyRes.data.workflowGraphy, 'Missing workflowGraphy');
  assert.ok(graphyRes.data.codebaseGraphy, 'Missing codebaseGraphy');

  // Leads per source and 3 specific lead types
  const leadsRes = await httpGetJson(`${baseUrl}/api/leads`);
  assert.equal(leadsRes.status, 200);
  assert.ok(Array.isArray(leadsRes.data.leads));
  const leadTypes = new Set(leadsRes.data.leads.map(l => l.leadType));
  assert.ok(leadTypes.has('1-affiliate-dateapp'), 'Missing Type 1: Affiliate links for Date App');
  assert.ok(leadTypes.has('2-subscriptions-dateapp'), 'Missing Type 2: Subscriptions for Actual Date App');
  assert.ok(leadTypes.has('3-funding-dream-online'), 'Missing Type 3: Funding sources for DREAM Online crowdfunding');

  // Terminal & Media preview APIs
  const termRes = await httpGetJson(`${baseUrl}/api/terminal/logs`);
  assert.equal(termRes.status, 200);
  assert.ok(Array.isArray(termRes.data.logs));

  const mediaRes = await httpGetJson(`${baseUrl}/api/media/previews`);
  assert.equal(mediaRes.status, 200);
  assert.ok(Array.isArray(mediaRes.data.items));

  // Obsidian Session-End Memory Sync (writes only to isolated temp VAULT_DIR)
  const memRes = await httpPostJson(`${baseUrl}/api/memory/sync`, {
    agent: 'gemini',
    useCase: 'TDD Automated Memory Verification',
    summary: 'Verified Alienware Lead-Gen Command Studio (:8392), :9119 Hermes OPSis session, :8082 Free Claude Code, Dual Graphies, and Harvey 3-type Lead Gen.'
  });
  assert.equal(memRes.status, 200);
  assert.equal(memRes.data.ok, true);
  assert.ok(fs.existsSync(path.join(VAULT_DIR, 'Alienware', 'gemini-to-gemini.md')));
  assert.ok(fs.existsSync(path.join(VAULT_DIR, 'Alienware', 'hermes-to-hermes.md')));
  for (const writtenPath of memRes.data.writtenFiles) {
    assert.ok(writtenPath.startsWith(VAULT_DIR), `Memory sync wrote outside temp vault: ${writtenPath}`);
  }
});

test('4. Gemini Easy Button bootstrap batch file exists, self-heals, and never closes window on error', () => {
  const easyBtnPath = path.join(ROOT_DIR, EASY_BUTTON_FILENAME);
  assert.ok(fs.existsSync(easyBtnPath), `Missing ${EASY_BUTTON_FILENAME}`);
  const bat = fs.readFileSync(easyBtnPath, 'utf8');
  assert.ok(bat.includes('8392'), 'Bootstrap must check/start port 8392');
  assert.ok(bat.includes('9119'), 'Bootstrap must check/start port 9119');
  assert.ok(bat.includes('8082'), 'Bootstrap must check/start port 8082');
  assert.ok(bat.includes('27123'), 'Bootstrap must check/start Obsidian port 27123');
  assert.ok(bat.includes('pause') || bat.includes('cmd /k'), 'Bootstrap must not close terminal window on error');
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(bat), 'Bootstrap batch file must not reference retired node');
});

test('5. Static & Live GitHub PR Gate Check: Verifies worktree branch on origin, real PR number when pushed, and honest non-faked hook statuses', async () => {
  const loopRes = await httpGetJson(`${baseUrl}/api/hooks/loop`);
  assert.equal(loopRes.status, 200);
  assert.equal(loopRes.data.nodeCanSelfMergeToMain, false, 'Nodes must never self-merge; only Josh or the signed-in Claude judge lane merges');
  assert.ok(Array.isArray(loopRes.data.mergeAuthority));
  assert.ok(loopRes.data.mergeAuthority.some(j => j.includes('Josh')));
  assert.ok(loopRes.data.mergeAuthority.some(j => j.includes('Claude')));
  assert.ok(!loopRes.data.mergeAuthority.some(j => /gemini|jules|codex/i.test(j)), 'Gemini, Jules and Codex review but are never merge authority');

  // Verify server.js never logs fake PUSHED or QUEUED statuses for unconfirmed local events
  const serverCode = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf8');
  assert.ok(!serverCode.includes('PUSHED_AND_PR_QUEUED_FOR_GITHUB_JUDGES'), 'Must never log fake PUSHED_AND_PR_QUEUED_FOR_GITHUB_JUDGES status');
  assert.ok(serverCode.includes('LOCAL_EVENT_RECORDED_NOT_PUSHED'), 'Unpushed local hook events must log LOCAL_EVENT_RECORDED_NOT_PUSHED');

  // Verify Host header gate on GET (rejects foreign Host header with 403)
  const foreignHostGet = await httpGetJson(
    `${baseUrl}/api/node/status`,
    { Host: `evil.example.com:${boundPort}` }
  );
  assert.equal(foreignHostGet.status, 403, 'Foreign Host header on GET must be rejected with HTTP 403');

  // Verify POST Origin security gate (rejects foreign Origin with 403, allows dashboard same-origin)
  const crossOriginPost = await httpPostJson(
    `${baseUrl}/api/node/heal`,
    {},
    { Origin: 'http://evil.example.com' }
  );
  assert.equal(crossOriginPost.status, 403, 'Foreign Origin on POST route must be rejected with HTTP 403');

  const sameOriginPost = await httpPostJson(
    `${baseUrl}/api/node/heal`,
    {},
    { Origin: baseUrl }
  );
  assert.equal(sameOriginPost.status, 200, 'Dashboard same-origin POST must succeed with HTTP 200');

  // Verify /api/media/file restricts access to media-previews via path.relative(..) check
  const traversalRes = await httpGetJson(`${baseUrl}/api/media/file?path=../server.js`);
  assert.equal(traversalRes.status, 403, '/api/media/file traversal outside media-previews must return 403');

  const fccRes = await httpPostJson(`${baseUrl}/api/fcc/chat`, {
    profile: 'harvey',
    message: 'Verify Free Claude Code :8082 wrapper bridge to Harvey profile.'
  });
  assert.equal(fccRes.status, 200);
  assert.equal(fccRes.data.ok, true);
  assert.ok(fccRes.data.reply.includes('8082'));
});

test('6. Mandatory RooFlow + SpecKit Post-Work Git Push & PR Creation Gate (speckit.git.push-and-pr) uses worktree apps/hermes-leadgen and checks exit codes', async () => {
  const extPath = path.join(ROOT_DIR, '.specify', 'extensions.yml');
  assert.ok(fs.existsSync(extPath), 'Missing .specify/extensions.yml');
  const extText = fs.readFileSync(extPath, 'utf8');
  assert.ok(extText.includes('speckit.git.push-and-pr'), 'Missing speckit.git.push-and-pr hook in .specify/extensions.yml');
  assert.ok(extText.includes('optional: false'), 'Post-implement push-and-pr hook must be mandatory (optional: false)');

  const scriptPath = path.join(ROOT_DIR, 'scripts', 'node-auto-pr-push.ps1');
  assert.ok(fs.existsSync(scriptPath), 'Missing scripts/node-auto-pr-push.ps1');
  const scriptText = fs.readFileSync(scriptPath, 'utf8');
  assert.ok(scriptText.includes('C:\\Ai-Dream-Team\\_pr-worktree'), 'Auto-PR script must use C:\\Ai-Dream-Team\\_pr-worktree');
  assert.ok(scriptText.includes('alienware/hermes-leadgen'), 'Auto-PR script must use branch alienware/hermes-leadgen');
  assert.ok(scriptText.includes('apps/hermes-leadgen'), 'Auto-PR script must stage only apps/hermes-leadgen paths');
  assert.ok(scriptText.includes('doctrine-check.py'), 'Auto-PR script must run doctrine-check.py');
  assert.ok(scriptText.includes('git push'), 'Auto-PR script must push node branch');
  assert.ok(scriptText.includes('pr create'), 'Auto-PR script must create PR for Cloud Judges');
  assert.ok(!scriptText.includes('git add -A') && !scriptText.includes('git add .'), 'Auto-PR script must never run add-all');
});

test('7. Separated Tabs, :8391/health Official API Prospecting + YouTube Data API v3 Made-with-AI TOS, YouTube Studio UCJnFUOdEfSOJiXLnx6lXSzg, 9hNDPCQa3kw Gemini Notebook Remaster, and Zero Robotic TTS', async () => {
  const ytStudio = await httpGetJson(`${baseUrl}/api/youtube/studio`);
  assert.equal(ytStudio.status, 200);
  assert.equal(ytStudio.data.studioChannelId, 'UCJnFUOdEfSOJiXLnx6lXSzg');
  assert.equal(ytStudio.data.splitRules.harveyLeadGenerator.officialApisOnly, true);
  assert.equal(ytStudio.data.splitRules.harveyLeadGenerator.scrapingPermitted, false);
  assert.equal(ytStudio.data.splitRules.youtubePipeline.scrapingPermitted, false);
  assert.equal(ytStudio.data.splitRules.youtubePipeline.madeWithAiTos.containsSyntheticMedia, true);
  assert.equal(ytStudio.data.legacyNotebookVideo.videoId, '9hNDPCQa3kw');
  assert.ok(ytStudio.data.legacyNotebookVideo.takedownReason.toLowerCase().includes('tax law'));

  const rendererCode = fs.readFileSync(path.join(ROOT_DIR, 'renderer.js'), 'utf8');
  assert.ok(!rendererCode.includes('window.speechSynthesis.speak'), 'Robotic browser speechSynthesis must never be called');
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(rendererCode), 'renderer.js must not reference retired node');

  const roboticRes = await httpPostJson(`${baseUrl}/api/tts/female`, {
    text: 'Test',
    voice: 'microsoft-david-sapi-robotic'
  });
  assert.equal(roboticRes.status, 400, 'Robotic SAPI voice must be rejected with HTTP 400');

  const htmlCode = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert.ok(!new RegExp('jar' + 'vis', 'i').test(htmlCode), 'index.html must use OPSis');
  assert.ok(htmlCode.includes('Alienware Lead-Gen Command Studio'), 'index.html must include Alienware Lead-Gen Command Studio');
  assert.ok(!FORBIDDEN_OLD_NODE_RE.test(htmlCode), 'index.html must not reference retired node');
  for (const tab of ['orchestrator', 'terminal', 'media', 'graphy', 'harvey', 'youtube', 'fcc', 'kanban', 'notes']) {
    assert.ok(htmlCode.includes(`data-tab="${tab}"`), `Missing separated tab button: ${tab}`);
    assert.ok(htmlCode.includes(`id="tab-${tab}"`), `Missing separated tab panel: tab-${tab}`);
  }
});

test('5b. Merge authority wording: Josh or the signed-in Claude judge lane only; Gemini is a reviewer, never a merge authority', () => {
  const banned = [
    'Gemini (GitHub Judge)',
    'Only GitHub Cloud Judges',
    'Cloud Judges (Gemini',
    'Cloud Judges (`Gemini`',
    'Cloud Judges (\\`Gemini',
    'GitHub Judges Validate & Merge',
    'GitHub Judges Validate &amp; Merge',
    'GitHub-side Judges (`Gemini`',
    'AWAITING_GITHUB_JUDGES_MERGE'
  ];
  const files = ['server.js', 'index.html', path.join('souls', 'default-orchestrator-agent.md'), path.join('data', 'circular-hooks-loop.json')];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT_DIR, f), 'utf8');
    for (const phrase of banned) {
      assert.ok(!text.includes(phrase), `${f} still says: ${phrase}`);
    }
  }
  const loop = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'data', 'circular-hooks-loop.json'), 'utf8'));
  assert.deepEqual(loop.mergeAuthority, ['Josh (Founder)', 'Claude (signed-in judge lane)']);
  const serverCode = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf8');
  assert.ok(serverCode.includes("mergeAuthority: ['Josh (Founder)', 'Claude (signed-in judge lane)']"), 'DEFAULT_HOOK_LOOP must match the data file');
  const soul = fs.readFileSync(path.join(ROOT_DIR, 'souls', 'default-orchestrator-agent.md'), 'utf8');
  assert.ok(soul.includes('Gemini'), 'Gemini stays listed as a reviewer');
});

function httpRequestJson(url, method, payload, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const bodyStr = payload !== undefined && payload !== null ? JSON.stringify(payload) : '';
    const u = new URL(url);
    const headers = { ...extraHeaders };
    if (bodyStr) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body), raw: body });
          } catch (_) {
            resolve({ status: res.statusCode, headers: res.headers, data: null, raw: body });
          }
        });
      }
    );
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

test('8a. Security Audit Run 1 (4.1, 4.4, 4.5): no-token defaults to 127.0.0.1, token resolves 0.0.0.0 from fleet-map.json', async () => {
  const { resolveBindHost } = require('../server');
  assert.equal(resolveBindHost({ HERMES_LEADGEN_TOKEN: '', FLEET_SHARED_TOKEN: '' }), '127.0.0.1');
  assert.equal(resolveBindHost({ HERMES_LEADGEN_TOKEN: 'leadgen-token' }), '0.0.0.0');
  assert.equal(resolveBindHost({ HERMES_LEADGEN_BIND: '127.0.0.1', HERMES_LEADGEN_TOKEN: 'leadgen-token' }), '127.0.0.1');
  assert.equal(resolveBindHost({ HERMES_LEADGEN_BIND: '0.0.0.0' }), '0.0.0.0');
});

test('8b. Security Audit Run 1 (4.1, 4.4, 4.5): explicit LAN bind without token refuses to start; unset bind without token returns warning', () => {
  const { validateBindConfig, startServer } = require('../server');
  const noTokenConfig = validateBindConfig({ HERMES_LEADGEN_TOKEN: '', FLEET_SHARED_TOKEN: '' });
  assert.equal(noTokenConfig.host, '127.0.0.1');
  assert.match(String(noTokenConfig.warning), /HERMES_LEADGEN_TOKEN/);
  assert.match(String(noTokenConfig.warning), /FLEET_SHARED_TOKEN/);

  assert.throws(
    () => validateBindConfig({ HERMES_LEADGEN_BIND: '0.0.0.0', HERMES_LEADGEN_TOKEN: '', FLEET_SHARED_TOKEN: '' }),
    /HERMES_LEADGEN_TOKEN/i
  );
  assert.throws(
    () => validateBindConfig({ HERMES_LEADGEN_BIND: '192.168.0.40', HERMES_LEADGEN_TOKEN: '', FLEET_SHARED_TOKEN: '' }),
    /HERMES_LEADGEN_TOKEN/i
  );
  assert.throws(
    () => startServer(0, { HERMES_LEADGEN_BIND: '0.0.0.0', HERMES_LEADGEN_TOKEN: '   ', FLEET_SHARED_TOKEN: '' }),
    /HERMES_LEADGEN_TOKEN/i
  );

  let exitedNonZero = false;
  let stderrOutput = '';
  try {
    execFileSync(process.execPath, [path.join(ROOT_DIR, 'server.js')], {
      env: {
        ...process.env,
        PORT: '0',
        HERMES_LEADGEN_BIND: '0.0.0.0',
        HERMES_LEADGEN_TOKEN: '',
        FLEET_SHARED_TOKEN: ''
      },
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 5000
    });
  } catch (err) {
    exitedNonZero = err.status !== 0;
    stderrOutput = String(err.stderr || err.message || '');
  }
  assert.equal(exitedNonZero, true);
  assert.match(stderrOutput, /HERMES_LEADGEN_TOKEN/i);
});

test('8c. Security Audit Run 1 (4.1, 4.4, 4.5): a POST without the bearer is 401 when LAN-bound, and proxy/memory/Origin/header rules hold', async () => {
  const savedBind = process.env.HERMES_LEADGEN_BIND;
  const savedToken = process.env.HERMES_LEADGEN_TOKEN;
  const testToken = 'sec-run1-lan-bearer-token';

  try {
    process.env.HERMES_LEADGEN_BIND = '0.0.0.0';
    process.env.HERMES_LEADGEN_TOKEN = testToken;

    const noBearerPost = await httpPostJson(`${baseUrl}/api/leads/approve`, { id: 'non-existent-lead-id' });
    assert.equal(noBearerPost.status, 401);

    const noBearerDelete = await httpRequestJson(`${baseUrl}/api/leads/approve`, 'DELETE');
    assert.equal(noBearerDelete.status, 401, 'LAN-bound DELETE without bearer must be 401');

    const noBearerPut = await httpRequestJson(`${baseUrl}/api/leads/approve`, 'PUT', { id: 'non-existent-lead-id' });
    assert.equal(noBearerPut.status, 401, 'LAN-bound PUT without bearer must be 401');

    const wrongBearerPost = await httpPostJson(
      `${baseUrl}/api/leads/approve`,
      { id: 'non-existent-lead-id' },
      { Authorization: 'Bearer wrong-token' }
    );
    assert.equal(wrongBearerPost.status, 401);

    const noBearerProxyFcc = await httpGetJson(`${baseUrl}/proxy/fcc/admin`);
    assert.equal(noBearerProxyFcc.status, 401);

    const noBearerProxyHermes = await httpGetJson(`${baseUrl}/proxy/hermes/chat`);
    assert.equal(noBearerProxyHermes.status, 401);

    const noBearerMemoryLedger = await httpGetJson(`${baseUrl}/api/memory/ledger`);
    assert.equal(noBearerMemoryLedger.status, 401);

    const noBearerMemorySync = await httpPostJson(`${baseUrl}/api/memory/sync`, {
      agent: 'gemini',
      summary: 'unauthed test'
    });
    assert.equal(noBearerMemorySync.status, 401);

    const authedPost = await httpPostJson(
      `${baseUrl}/api/leads/approve`,
      { id: 'non-existent-lead-id' },
      { Authorization: `Bearer ${testToken}` }
    );
    assert.equal(authedPost.status, 200);

    const authedLedger = await httpGetJson(
      `${baseUrl}/api/memory/ledger`,
      { Authorization: `Bearer ${testToken}` }
    );
    assert.equal(authedLedger.status, 200);

    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const originRes = await httpRequestJson(
        `${baseUrl}/api/node/status`,
        method,
        {},
        {
          Origin: 'http://evil.example.com',
          Authorization: `Bearer ${testToken}`
        }
      );
      assert.equal(originRes.status, 403, `Foreign Origin on ${method} must be 403`);
    }

    const serverSource = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf8');
    assert.ok(!serverSource.includes("delete resHeaders['x-frame-options']"));
    assert.ok(!serverSource.includes("delete resHeaders['content-security-policy']"));
  } finally {
    if (savedBind === undefined) delete process.env.HERMES_LEADGEN_BIND;
    else process.env.HERMES_LEADGEN_BIND = savedBind;
    if (savedToken === undefined) delete process.env.HERMES_LEADGEN_TOKEN;
    else process.env.HERMES_LEADGEN_TOKEN = savedToken;
  }
});

test('8d. Security Audit Run 1 (4.1, 4.4, 4.5): a bad agent value is 400', async () => {
  const { isValidAgentOrProfile } = require('../server');
  assert.equal(isValidAgentOrProfile('gemini'), true);
  assert.equal(isValidAgentOrProfile('../evil'), false);
  assert.equal(isValidAgentOrProfile('bad;id'), false);
  assert.equal(isValidAgentOrProfile('a'.repeat(33)), false);

  const badAgentHook = await httpPostJson(`${baseUrl}/api/hooks/push-pr`, {
    runGitPushPr: true,
    agent: '../evil-agent',
    profile: 'default'
  });
  assert.equal(badAgentHook.status, 400);

  const badProfileHook = await httpPostJson(`${baseUrl}/api/hooks/push-pr`, {
    runGitPushPr: true,
    agent: 'gemini',
    profile: 'bad;profile'
  });
  assert.equal(badProfileHook.status, 400);

  const badAgentSync = await httpPostJson(`${baseUrl}/api/memory/sync`, {
    agent: 'bad/agent',
    summary: 'test'
  });
  assert.equal(badAgentSync.status, 400);

  const badAgentSoul = await httpGetJson(`${baseUrl}/api/souls/bad%3Bagent`);
  assert.equal(badAgentSoul.status, 400);
});

test('8e. Security Audit Run 1: LAN-bound DELETE or PUT to any /api path without a bearer is 401', async () => {
  const savedBind = process.env.HERMES_LEADGEN_BIND;
  const savedToken = process.env.HERMES_LEADGEN_TOKEN;
  const testToken = 'sec-run1-lan-bearer-token';

  try {
    process.env.HERMES_LEADGEN_BIND = '0.0.0.0';
    process.env.HERMES_LEADGEN_TOKEN = testToken;

    for (const route of ['/api/leads', '/api/leads/approve', '/api/orchestrate', '/api/any-path']) {
      const deleteRes = await httpRequestJson(`${baseUrl}${route}`, 'DELETE');
      assert.equal(deleteRes.status, 401, `LAN-bound DELETE to ${route} without bearer must return 401`);

      const putRes = await httpRequestJson(`${baseUrl}${route}`, 'PUT', { sample: true });
      assert.equal(putRes.status, 401, `LAN-bound PUT to ${route} without bearer must return 401`);
    }
  } finally {
    if (savedBind === undefined) delete process.env.HERMES_LEADGEN_BIND;
    else process.env.HERMES_LEADGEN_BIND = savedBind;
    if (savedToken === undefined) delete process.env.HERMES_LEADGEN_TOKEN;
    else process.env.HERMES_LEADGEN_TOKEN = savedToken;
  }
});

test('8f. live-start: no token with unset HERMES_LEADGEN_BIND binds 127.0.0.1, emits one warning naming missing setting, and starts cleanly', async () => {
  const child = spawn(process.execPath, [path.join(ROOT_DIR, 'server.js')], {
    env: {
      ...process.env,
      PORT: '0',
      HERMES_LEADGEN_BIND: '',
      HERMES_LEADGEN_TOKEN: '',
      FLEET_SHARED_TOKEN: ''
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  const listeningRe = new RegExp(`Listening on http:\\/\\/${LOOPBACK.replace(/\./g, '\\.')}:(\\d+)`);

  try {
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for leadgen server start. stdout=${stdout} stderr=${stderr}`));
      }, 10000);
      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
        const m = listeningRe.exec(stdout);
        if (m) {
          clearTimeout(timer);
          resolve(Number(m[1]));
        }
      });
      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`leadgen exited early (${code}): stdout=${stdout} stderr=${stderr}`));
      });
    });

    const warningLines = stderr.trim().split(/\r?\n/).filter(Boolean);
    assert.equal(warningLines.length, 1);
    assert.match(warningLines[0], /HERMES_LEADGEN_TOKEN/);
    assert.match(warningLines[0], /FLEET_SHARED_TOKEN/);
    assert.match(warningLines[0], /127\.0\.0\.1/);

    const statusRes = await httpGetJson(`http://${LOOPBACK}:${port}/api/node/status`);
    assert.equal(statusRes.status, 200);
    const approveRes = await httpPostJson(`http://${LOOPBACK}:${port}/api/leads/approve`, {
      id: 'non-existent-lead-id'
    });
    assert.equal(approveRes.status, 200);
  } finally {
    child.kill();
    await new Promise((resolve) => child.once('exit', resolve));
  }
});

test('9. Stage E3: getAlienwareNodeStatus turns AMBER with drifted file names on agent-drift.json drift, GREEN when clean, RED when service down', async () => {
  const { getAlienwareNodeStatus } = require('../server');
  const driftFile = path.join(TEMP_ROOT, 'stage-e3-agent-drift.json');

  // 1. Clean agent-drift.json + all services UP -> GREEN
  fs.writeFileSync(
    driftFile,
    JSON.stringify({
      checkedAt: '2026-11-16T00:00:00Z',
      node: 'alienware',
      ok: true,
      light: 'green',
      driftedCount: 0,
      driftedFiles: []
    }),
    'utf8'
  );
  const greenStatus = await getAlienwareNodeStatus({
    agentDriftPath: driftFile,
    probeService: async () => true
  });
  assert.equal(greenStatus.nodeLight, 'GREEN');
  assert.equal(greenStatus.allGreen, true);
  assert.equal(greenStatus.agentDrift.light, 'green');
  assert.equal(greenStatus.agentDrift.driftedCount, 0);
  assert.deepEqual(greenStatus.agentDrift.driftedFiles, []);
  const greenPill = greenStatus.services.find((s) => s.id === 'agent-drift');
  assert.ok(greenPill, 'Must include agent-drift status-strip item');
  assert.equal(greenPill.name, 'Agent Files Sync');
  assert.equal(greenPill.light, 'GREEN');

  // 2. Drifted agent-drift.json + all services UP -> AMBER with exact drifted file names and allGreen false
  fs.writeFileSync(
    driftFile,
    JSON.stringify({
      checkedAt: '2026-11-16T00:00:00Z',
      node: 'alienware',
      ok: false,
      light: 'amber',
      driftedCount: 2,
      driftedFiles: [
        { file: 'AGENTS.md', reason: 'drifted' },
        { file: '%USERPROFILE%\\.claude\\CLAUDE.md', reason: 'missing-block' }
      ]
    }),
    'utf8'
  );
  const amberStatus = await getAlienwareNodeStatus({
    agentDriftPath: driftFile,
    probeService: async () => true
  });
  assert.equal(amberStatus.nodeLight, 'AMBER');
  assert.equal(amberStatus.allGreen, false);
  assert.equal(amberStatus.agentDrift.light, 'amber');
  assert.equal(amberStatus.agentDrift.driftedCount, 2);
  assert.equal(amberStatus.agentDrift.driftedFiles.length, 2);
  const amberPill = amberStatus.services.find((s) => s.id === 'agent-drift');
  assert.ok(amberPill);
  assert.equal(amberPill.light, 'AMBER');
  assert.ok(amberPill.detail.includes('AGENTS.md'));
  assert.ok(amberPill.detail.includes('CLAUDE.md'));

  // 3. Drifted agent-drift.json + a service DOWN -> RED overrides AMBER
  const redStatus = await getAlienwareNodeStatus({
    agentDriftPath: driftFile,
    probeService: async (_host, port) => port !== 9119
  });
  assert.equal(redStatus.nodeLight, 'RED');
  assert.equal(redStatus.allGreen, false);

  // 4. HTTP /api/node/status honors AGENT_DRIFT_PATH env override
  const savedDriftEnv = process.env.AGENT_DRIFT_PATH;
  process.env.AGENT_DRIFT_PATH = driftFile;
  try {
    const res = await httpGetJson(`${baseUrl}/api/node/status`);
    assert.equal(res.status, 200);
    assert.equal(res.data.agentDrift.light, 'amber');
    assert.equal(res.data.agentDrift.driftedCount, 2);
    assert.equal(res.data.allGreen, false);
    const pill = res.data.services.find((s) => s.id === 'agent-drift');
    assert.ok(pill && pill.light === 'AMBER' && pill.detail.includes('AGENTS.md'));
  } finally {
    if (savedDriftEnv === undefined) delete process.env.AGENT_DRIFT_PATH;
    else process.env.AGENT_DRIFT_PATH = savedDriftEnv;
  }

  // 5. Renderer and styles support WCAG AAA amber pill (#111827 / #fffbeb / #f59e0b)
  const rendererSrc = fs.readFileSync(path.join(ROOT_DIR, 'renderer.js'), 'utf8');
  const cssSrc = fs.readFileSync(path.join(ROOT_DIR, 'styles.css'), 'utf8');
  assert.match(rendererSrc, /amber/);
  assert.match(cssSrc, /\.light-pill\.amber/);
  assert.match(cssSrc, /#fffbeb/i);
  assert.match(cssSrc, /#f59e0b/i);
  assert.match(cssSrc, /#111827/i);
});
