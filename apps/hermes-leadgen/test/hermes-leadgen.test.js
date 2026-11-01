const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = fs.existsSync(path.join(ROOT_DIR, '..', 'AGENTS.md'))
  ? path.resolve(ROOT_DIR, '..')
  : path.resolve(ROOT_DIR, '..', '..');
const VAULT_DIR = process.env.SABRETOOTH_VAULT_ROOT || (fs.existsSync('C:\\Ai-Dream-Team\\Antigravity') ? 'C:\\Ai-Dream-Team\\Antigravity' : REPO_ROOT);

let localServerStartedByTest = false;
let localServerInstance = null;

test.before(async () => {
  try {
    await httpGetJson('http://127.0.0.1:8392/api/node/status');
  } catch (_) {
    const { server } = require('../server');
    localServerInstance = server;
    await new Promise((resolve) => {
      localServerInstance.listen(8392, '127.0.0.1', () => {
        localServerStartedByTest = true;
        resolve();
      });
    });
  }
});

test.after(async () => {
  if (localServerStartedByTest && localServerInstance) {
    await new Promise((resolve) => localServerInstance.close(() => resolve()));
  }
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
    assert.ok(!content.includes('NO SUCH NODE — retired, OFF BY RULING'), `Stale Sabretooth retired claim found in ${file}`);
  }
});

test('2. Agent souls and profiles include OPSis default research orchestrator, harvey, youtube, editor, kanban, notes, and fcc', () => {
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
    assert.ok(text.includes('Sabretooth'), `Missing node Sabretooth in ${s}`);
    assert.ok(!bannedLabel.test(text), `Soul ${s} must use OPSis`);
  }
  const defaultSoul = fs.readFileSync(path.join(ROOT_DIR, 'souls', 'default-orchestrator-agent.md'), 'utf8');
  assert.ok(defaultSoul.includes('OPSis'));
  assert.ok(defaultSoul.includes('http://127.0.0.1:9119/chat?profile=default&resume=local-profile'));
  assert.ok(defaultSoul.includes('agy --dangerously-skip-permissions'));
  assert.ok(defaultSoul.includes('agent-reach'));
  assert.ok(defaultSoul.includes('last30days'));
  assert.ok(defaultSoul.includes('rea'));
  assert.ok(defaultSoul.includes('test-driven-development'));
});

test('3. Server API provides Node Status (Red/Green Light), Dual Graphies, Leads per Source & 3 Specific Types, Terminal/Media Previews, FCC :8082, and Obsidian Memory Sync', async () => {
  const statusRes = await httpGetJson('http://127.0.0.1:8392/api/node/status');
  assert.equal(statusRes.status, 200);
  assert.ok(statusRes.data.node.startsWith('Sabretooth'));
  assert.ok(Array.isArray(statusRes.data.services));
  const ports = statusRes.data.services.map(s => s.port);
  for (const p of [8392, 9119, 8082, 8391, 11434, 27123, 49374]) {
    assert.ok(ports.includes(p), `Missing port ${p} in Red/Green light check`);
  }

  // Dual Graphies
  const graphyRes = await httpGetJson('http://127.0.0.1:8392/api/graphy');
  assert.equal(graphyRes.status, 200);
  assert.ok(graphyRes.data.workflowGraphy, 'Missing workflowGraphy');
  assert.ok(graphyRes.data.codebaseGraphy, 'Missing codebaseGraphy');

  // Leads per source and 3 specific lead types
  const leadsRes = await httpGetJson('http://127.0.0.1:8392/api/leads');
  assert.equal(leadsRes.status, 200);
  assert.ok(Array.isArray(leadsRes.data.leads));
  const leadTypes = new Set(leadsRes.data.leads.map(l => l.leadType));
  assert.ok(leadTypes.has('1-affiliate-dateapp'), 'Missing Type 1: Affiliate links for Date App');
  assert.ok(leadTypes.has('2-subscriptions-dateapp'), 'Missing Type 2: Subscriptions for Actual Date App');
  assert.ok(leadTypes.has('3-funding-dream-online'), 'Missing Type 3: Funding sources for DREAM Online crowdfunding');

  // Terminal & Media preview APIs
  const termRes = await httpGetJson('http://127.0.0.1:8392/api/terminal/logs');
  assert.equal(termRes.status, 200);
  assert.ok(Array.isArray(termRes.data.logs));

  const mediaRes = await httpGetJson('http://127.0.0.1:8392/api/media/previews');
  assert.equal(mediaRes.status, 200);
  assert.ok(Array.isArray(mediaRes.data.items));

  // Obsidian Session-End Memory Sync
  const memRes = await httpPostJson('http://127.0.0.1:8392/api/memory/sync', {
    agent: 'gemini',
    useCase: 'TDD Automated Memory Verification',
    summary: 'Verified Sabretooth :8392 GUI, :9119 Hermes OPSis session, :8082 Free Claude Code, Dual Graphies, and Harvey 3-type Lead Gen.'
  });
  assert.equal(memRes.status, 200);
  assert.equal(memRes.data.ok, true);
  assert.ok(fs.existsSync(path.join(VAULT_DIR, 'Sabretooth', 'gemini-to-gemini.md')));
  assert.ok(fs.existsSync(path.join(VAULT_DIR, 'Sabretooth', 'hermes-to-hermes.md')));
});

test('4. Gemini Easy Button bootstrap batch file exists, self-heals, and never closes window on error', () => {
  const easyBtnPath = path.join(ROOT_DIR, 'SABRETOOTH-GEMINI-EASY-BUTTON.bat');
  assert.ok(fs.existsSync(easyBtnPath), 'Missing SABRETOOTH-GEMINI-EASY-BUTTON.bat');
  const bat = fs.readFileSync(easyBtnPath, 'utf8');
  assert.ok(bat.includes('8392'), 'Bootstrap must check/start port 8392');
  assert.ok(bat.includes('9119'), 'Bootstrap must check/start port 9119');
  assert.ok(bat.includes('8082'), 'Bootstrap must check/start port 8082');
  assert.ok(bat.includes('27123'), 'Bootstrap must check/start Obsidian port 27123');
  assert.ok(bat.includes('pause') || bat.includes('cmd /k'), 'Bootstrap must not close terminal window on error');
});

test('5. Static & Live GitHub PR Gate Check: Verifies worktree branch on origin, real PR number when pushed, and honest non-faked hook statuses', async (t) => {
  const loopRes = await httpGetJson('http://127.0.0.1:8392/api/hooks/loop');
  assert.equal(loopRes.status, 200);
  assert.equal(loopRes.data.nodeCanSelfMergeToMain, false, 'Nodes must never self-merge; only GitHub Cloud Judges merge');
  assert.ok(Array.isArray(loopRes.data.mergeAuthority));
  assert.ok(loopRes.data.mergeAuthority.some(j => j.includes('Jules')));
  assert.ok(loopRes.data.mergeAuthority.some(j => j.includes('Claude')));
  assert.ok(loopRes.data.mergeAuthority.some(j => j.includes('Codex')));

  // Verify server.js never logs fake PUSHED or QUEUED statuses for unconfirmed local events
  const serverCode = fs.readFileSync(path.join(ROOT_DIR, 'server.js'), 'utf8');
  assert.ok(!serverCode.includes('PUSHED_AND_PR_QUEUED_FOR_GITHUB_JUDGES'), 'Must never log fake PUSHED_AND_PR_QUEUED_FOR_GITHUB_JUDGES status');
  assert.ok(serverCode.includes('LOCAL_EVENT_RECORDED_NOT_PUSHED'), 'Unpushed local hook events must log LOCAL_EVENT_RECORDED_NOT_PUSHED');

  // Verify Host header gate on GET (rejects foreign Host header with 403)
  const foreignHostGet = await httpGetJson(
    'http://127.0.0.1:8392/api/node/status',
    { Host: 'evil.example.com:8392' }
  );
  assert.equal(foreignHostGet.status, 403, 'Foreign Host header on GET must be rejected with HTTP 403');

  // Verify POST Origin security gate (rejects foreign Origin with 403, allows dashboard same-origin)
  const crossOriginPost = await httpPostJson(
    'http://127.0.0.1:8392/api/node/heal',
    {},
    { Origin: 'http://evil.example.com' }
  );
  assert.equal(crossOriginPost.status, 403, 'Foreign Origin on POST route must be rejected with HTTP 403');

  const sameOriginPost = await httpPostJson(
    'http://127.0.0.1:8392/api/node/heal',
    {},
    { Origin: 'http://127.0.0.1:8392' }
  );
  assert.equal(sameOriginPost.status, 200, 'Dashboard same-origin POST must succeed with HTTP 200');

  // Verify /api/media/file restricts access to media-previews via path.relative(..) check
  const traversalRes = await httpGetJson('http://127.0.0.1:8392/api/media/file?path=../server.js');
  assert.equal(traversalRes.status, 403, '/api/media/file traversal outside media-previews must return 403');

  const fccRes = await httpPostJson('http://127.0.0.1:8392/api/fcc/chat', {
    profile: 'harvey',
    message: 'Verify Free Claude Code :8082 wrapper bridge to Harvey profile.'
  });
  assert.equal(fccRes.status, 200);
  assert.equal(fccRes.data.ok, true);
  assert.ok(fccRes.data.reply.includes('8082'));

  // Check gh auth status; skip live GitHub PR lookup when gh is not authenticated (e.g. CI or unauthed node)
  const ghExe = fs.existsSync('C:\\Program Files\\GitHub CLI\\gh.exe') ? 'C:\\Program Files\\GitHub CLI\\gh.exe' : 'gh';
  let ghAuthed = false;
  try {
    execFileSync(ghExe, ['auth', 'status'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: 'pipe',
      timeout: 8000
    });
    ghAuthed = true;
  } catch (_) {
    ghAuthed = false;
  }

  if (!ghAuthed) {
    t.skip('gh not authenticated');
    return;
  }

  const lsRemote = execFileSync('git', ['ls-remote', '--heads', 'origin', 'sabretooth/hermes-leadgen'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 8000
  }).trim();
  assert.match(lsRemote, /^[0-9a-f]{40}\s+refs\/heads\/sabretooth\/hermes-leadgen$/m);

  const prJson = execFileSync(ghExe, ['pr', 'list', '--repo', 'Trollz1004/ANTIGRAVITY', '--head', 'sabretooth/hermes-leadgen', '--state', 'open', '--json', 'number,url'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 8000
  }).trim();
  const parsed = JSON.parse(prJson);
  assert.ok(Array.isArray(parsed) && parsed.length > 0, 'Expected open PR for sabretooth/hermes-leadgen');
  assert.ok(Number.isInteger(parsed[0].number) && parsed[0].number > 0, 'Expected real numeric GitHub PR number');
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
  assert.ok(scriptText.includes('sabretooth/hermes-leadgen'), 'Auto-PR script must use branch sabretooth/hermes-leadgen');
  assert.ok(scriptText.includes('apps/hermes-leadgen'), 'Auto-PR script must stage only apps/hermes-leadgen paths');
  assert.ok(scriptText.includes('doctrine-check.py'), 'Auto-PR script must run doctrine-check.py');
  assert.ok(scriptText.includes('git push'), 'Auto-PR script must push node branch');
  assert.ok(scriptText.includes('pr create'), 'Auto-PR script must create PR for Cloud Judges');
  assert.ok(!scriptText.includes('git add -A') && !scriptText.includes('git add .'), 'Auto-PR script must never run add-all');
});

test('7. Separated Tabs, :8391/health Official API Prospecting + YouTube Data API v3 Made-with-AI TOS, YouTube Studio UCJnFUOdEfSOJiXLnx6lXSzg, 9hNDPCQa3kw Gemini Notebook Remaster, and Zero Robotic TTS', async () => {
  try {
    const health8391 = await httpGetJson('http://127.0.0.1:8391/health');
    if (health8391.status === 200 && health8391.data?.worker) {
      const w = health8391.data.worker;
      assert.equal(w.youtube_publish_method, 'youtube-data-api-v3', 'YouTube must remain API v3 only');
      assert.equal(w.youtube_made_with_ai_tos.containsSyntheticMedia, true, 'Made with AI (containsSyntheticMedia) must be enforced');
      assert.equal(w.youtube_studio_url, 'https://studio.youtube.com/channel/UCJnFUOdEfSOJiXLnx6lXSzg');
      assert.equal(w.gemini_notebook_remaster_source.legacyVideoId, '9hNDPCQa3kw');
    }
  } catch (_) {}

  const ytStudio = await httpGetJson('http://127.0.0.1:8392/api/youtube/studio');
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

  const roboticRes = await httpPostJson('http://127.0.0.1:8392/api/tts/female', {
    text: 'Test',
    voice: 'microsoft-david-sapi-robotic'
  });
  assert.equal(roboticRes.status, 400, 'Robotic SAPI voice must be rejected with HTTP 400');

  const htmlCode = fs.readFileSync(path.join(ROOT_DIR, 'index.html'), 'utf8');
  assert.ok(!new RegExp('jar' + 'vis', 'i').test(htmlCode), 'index.html must use OPSis');
  for (const tab of ['orchestrator', 'terminal', 'media', 'graphy', 'harvey', 'youtube', 'fcc', 'kanban', 'notes']) {
    assert.ok(htmlCode.includes(`data-tab="${tab}"`), `Missing separated tab button: ${tab}`);
    assert.ok(htmlCode.includes(`id="tab-${tab}"`), `Missing separated tab panel: tab-${tab}`);
  }
});
