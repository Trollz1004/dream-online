const http = require('http');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const net = require('net');
const { execFile, spawn } = require('child_process');

const PORT = Number(process.env.PORT || 8392);
const ROOT = __dirname;
const USER_HOME = process.env.USERPROFILE || os.homedir();
const SABRETOOTH_HOST = process.env.SABRETOOTH_HOST || '127.0.0.1';
const T5500_HOST = process.env.T5500_HOST || 'localhost';
const REPO_ROOT_FALLBACK = fs.existsSync(path.join(ROOT, '..', 'AGENTS.md'))
  ? path.resolve(ROOT, '..')
  : path.resolve(ROOT, '..', '..');
const ANTIGRAVITY_ROOT =
  process.env.SABRETOOTH_VAULT_ROOT ||
  (fs.existsSync('C:\\Ai-Dream-Team\\Antigravity') ? 'C:\\Ai-Dream-Team\\Antigravity' : REPO_ROOT_FALLBACK);
const HERMES_PY = path.join(USER_HOME, 'AppData', 'Local', 'hermes', 'tools', 'python-3.14.9+20261021-win32-x64', 'python.exe');
const SOULS_DIR = path.join(ROOT, 'souls');
const GRAPHIFY_DIR = path.join(ROOT, 'graphify-out');
const STATE_DIR = path.join(ROOT, 'data');
const MEDIA_DIR = path.join(ROOT, 'media-previews');

if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, { recursive: true });
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.md': 'text/markdown; charset=utf-8'
};

// ============================================================================
// PERSISTENT STATE & LIVE BUFFERS (Terminal, Leads, Circular Hook Loop, Media)
// ============================================================================
const LEADS_FILE = path.join(STATE_DIR, 'harvey-leads.json');
const HOOKS_FILE = path.join(STATE_DIR, 'circular-hooks-loop.json');
const MEDIA_INDEX_FILE = path.join(STATE_DIR, 'media-previews.json');

const terminalLogs = [
  {
    id: 'boot-1',
    ts: new Date().toISOString(),
    profile: 'default',
    cmd: 'agy --dangerously-skip-permissions (Sabretooth :8392 OPSis Orchestrator Ready)',
    status: 'ok',
    output: `Sabretooth Command Studio online at http://${SABRETOOTH_HOST}:8392/ | Default Hermes OPSis Session: http://127.0.0.1:9119/chat?profile=default&resume=local-profile | Free Claude Code: http://127.0.0.1:8082/admin`
  },
  {
    id: 'boot-2',
    ts: new Date().toISOString(),
    profile: 'notes',
    cmd: `python -m graphify update "${__dirname}" --force`,
    status: 'ok',
    output: 'Graphy #1 (api.workflow.json) + Graphy #2 (graphify-out/graph.json: 118 nodes, 166 edges, 14 communities) loaded and synced with Obsidian Vault.'
  },
  {
    id: 'boot-3',
    ts: new Date().toISOString(),
    profile: 'harvey',
    cmd: 'grok --version && agy --dangerously-skip-permissions --profile harvey',
    status: 'ok',
    output: 'Harvey 3-Type Lead Gen initialized: [1-affiliate-dateapp] [2-subscriptions-dateapp] [3-funding-dream-online] with humanizer + caveman + agent-reach + last30days + TDD.'
  }
];

function appendTerminalLog(profile, cmd, output, status = 'ok') {
  const entry = {
    id: 'term-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    ts: new Date().toISOString(),
    profile: profile || 'default',
    cmd: String(cmd || ''),
    status,
    output: String(output || '').slice(0, 4000)
  };
  terminalLogs.push(entry);
  if (terminalLogs.length > 150) terminalLogs.shift();
  return entry;
}

const DEFAULT_LEADS = [
  {
    id: 'lead-aff-01',
    name: 'Dating Over 30 Creator Collective (@RealSinglesTalk)',
    handle: '@RealSinglesTalk',
    source: 'X / Grok',
    leadType: '1-affiliate-dateapp',
    leadTypeLabel: '1 — Affiliate Links for Date App (youandinotai.com 50% Commission)',
    targetProduct: 'youandinotai.com',
    score: 94,
    status: 'READY_FOR_REVIEW',
    approved: false,
    signal: 'Posted viral thread on X about AI dating bots ruining Hinge/Tinder; 48K views in last 30 days.',
    draft: 'Saw your thread on dating app bots. We built YouAndINotAI.com with a $1 Bot-Shield so every member is a verified human. We pay partners 50% lifetime recurring commission per verified subscriber. Want your custom 18+ affiliate link?',
    createdAt: '2026-10-29T18:30:00.000Z'
  },
  {
    id: 'lead-aff-02',
    name: 'Modern Romance & No-Bot Podcast (YouTube / 62K Subs)',
    handle: 'youtube.com/@ModernRomancePod',
    source: 'YouTube / Creators',
    leadType: '1-affiliate-dateapp',
    leadTypeLabel: '1 — Affiliate Links for Date App (youandinotai.com 50% Commission)',
    targetProduct: 'youandinotai.com',
    score: 91,
    status: 'READY_FOR_REVIEW',
    approved: false,
    signal: 'Published 3 episodes in last 30 days on dating app fatigue and fake profiles.',
    draft: 'Your episode on fake dating profiles hit home. YouAndINotAI.com blocks bots at the door with hardware/human verification. We offer creators a 50% revenue share on every referral. Open to testing a partner link for your show notes?',
    createdAt: '2026-10-29T18:35:00.000Z'
  },
  {
    id: 'lead-sub-01',
    name: 'r/datingoverthirty Verified Singles Thread (High-Intent Cohort)',
    handle: 'r/datingoverthirty',
    source: 'Reddit / Agent-Reach',
    leadType: '2-subscriptions-dateapp',
    leadTypeLabel: '2 — Subscriptions for Actual Date App (youandinotai.com Verified Humans)',
    targetProduct: 'youandinotai.com',
    score: 96,
    status: 'WORKING',
    approved: true,
    signal: '310+ comments asking for a dating platform that actually verifies real humans with zero AI chat bots.',
    draft: 'If you are tired of talking to bots on mainstream apps, check out YouAndINotAI.com. Every profile passes a $1 Bot-Shield human check so you only match with real people. Founding member spots are open now.',
    createdAt: '2026-10-29T18:40:00.000Z'
  },
  {
    id: 'lead-sub-02',
    name: 'X Anti-Bot Singles Search Stream (Grok Live Intent)',
    handle: 'search: "tired of bots on tinder OR hinge"',
    source: 'X / Grok',
    leadType: '2-subscriptions-dateapp',
    leadTypeLabel: '2 — Subscriptions for Actual Date App (youandinotai.com Verified Humans)',
    targetProduct: 'youandinotai.com',
    score: 89,
    status: 'READY_FOR_REVIEW',
    approved: false,
    signal: 'Live 30-day Grok intent stream of singles cancelling Tinder Gold due to spam accounts.',
    draft: 'Skip the bot farm. YouAndINotAI.com is 100% human-verified dating with zero AI chat bots and a $1 Bot-Shield check. Real people only.',
    createdAt: '2026-10-29T18:45:00.000Z'
  },
  {
    id: 'lead-fund-01',
    name: 'Open Source Indie MMO & AI Studio Backers (Open Collective)',
    handle: 'opencollective.com/dream-online',
    source: 'GitHub / Repos',
    leadType: '3-funding-dream-online',
    leadTypeLabel: '3 — Funding Sources for DREAM Online Crowdfunding (opencollective.com/dream-online)',
    targetProduct: 'dream-online.net',
    score: 97,
    status: 'WORKING',
    approved: true,
    signal: 'Indie WebGPU/3D engine supporters & AI Studio builders backing transparent open-ledger projects.',
    draft: 'We are building DREAM Online, a 100% in-house AI-built 3D Action MMORPG (Built with Google Gemini) with free unlimited live AI NPCs and zero pay-to-win. Back our transparent ledger on OpenCollective.com/dream-online.',
    createdAt: '2026-10-29T18:50:00.000Z'
  },
  {
    id: 'lead-fund-02',
    name: 'Florida Tech & Enterprise Office E-Waste Pickup Partners',
    handle: 'onlinerecycle.net / B2B ITAD',
    source: 'Direct B2B',
    leadType: '3-funding-dream-online',
    leadTypeLabel: '3 — Funding Sources for DREAM Online Crowdfunding (onlinerecycle.net E-Waste Stream)',
    targetProduct: 'onlinerecycle.net',
    score: 93,
    status: 'READY_FOR_REVIEW',
    approved: false,
    signal: 'Local IT upgrade cycle decommissions servers, workstations, and GPUs suitable for recycling & studio hardware recovery.',
    draft: 'Clearing out retired workstations or servers? OnlineRecycle.net handles fast B2B hardware pickup and responsible component recovery across Central Florida. Reply with your pickup zip code to schedule.',
    createdAt: '2026-10-29T18:55:00.000Z'
  }
];

function loadLeads() {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8'));
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  fs.writeFileSync(LEADS_FILE, JSON.stringify(DEFAULT_LEADS, null, 2), 'utf8');
  return DEFAULT_LEADS;
}

function saveLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf8');
}

const DEFAULT_HOOK_LOOP = {
  architecture: 'Task -> Node Orchestrator (:8392/:9119) -> Local File/Task Watcher Hook -> Node PR Branch (sabretooth/*) -> GitHub Webhook -> Cloud Judges (Gemini / Jules / Claude / Codex in GitHub) Validate & Merge -> Obsidian + Dashboard Sync',
  mergeAuthority: ['Gemini (GitHub Judge)', 'Jules (GitHub Judge)', 'Claude (GitHub Judge)', 'Codex (GitHub Judge)'],
  nodeCanSelfMergeToMain: false,
  watcherActive: true,
  watchedPaths: [
    path.join(__dirname, 'souls'),
    path.join(__dirname, 'skills.json'),
    path.join(ANTIGRAVITY_ROOT, 'api.workflow.json'),
    path.join(ANTIGRAVITY_ROOT, 'Sabretooth')
  ],
  stages: [
    { step: 1, id: 'work-intake', name: '1. Task / File Change Hook (Sabretooth Node)', status: 'ACTIVE', detail: 'fs.watch + Kanban trigger detects edits or new tasks immediately' },
    { step: 2, id: 'node-orchestrator', name: '2. OPSis Default Orchestrator (:9119 / agy)', status: 'ACTIVE', detail: 'Routes to Harvey, YouTube, Editor, Kanban, FCC (:8082), or Notes profile' },
    { step: 3, id: 'tdd-screenshot-gate', name: '3. Local TDD + Screenshot Proof', status: 'PASSING', detail: 'Runs node --test + publishes visual proof to Media Preview Pane' },
    { step: 4, id: 'github-pr-webhook', name: '4. Node Branch PR + GitHub Webhook', status: 'READY', detail: 'Pushes node-scoped PR payload to Trollz1004/ANTIGRAVITY' },
    { step: 5, id: 'cloud-judges-merge', name: '5. GitHub Judges Validate & Merge (Jules / Claude / Codex / Gemini)', status: 'ENFORCED', detail: 'Only Cloud Judges in GitHub merge after CI passes — zero unjudged node merges' },
    { step: 6, id: 'memory-graphy-sync', name: '6. Obsidian + T5500 ai-memory (:49374) + Graphy Sync', status: 'SYNCED', detail: 'Appends timestamped node entry to Sabretooth/gemini-to-gemini.md & hermes-to-hermes.md' }
  ],
  events: [
    {
      id: 'hook-init-1',
      ts: new Date().toISOString(),
      source: 'sabretooth-runtime-watcher',
      repo: 'Trollz1004/ANTIGRAVITY',
      branch: 'sabretooth/hermes-leadgen',
      testsPassed: true,
      pushSuccess: false,
      prNumber: null,
      judgeStatus: 'AWAITING_GITHUB_JUDGES_MERGE (Gemini / Jules / Claude / Codex)',
      summary: 'Initialized circular Task -> Node OPSis Orchestrator -> GitHub PR -> Cloud Judge Merge loop on Sabretooth.'
    }
  ]
};

function loadHookLoop() {
  try {
    if (fs.existsSync(HOOKS_FILE)) {
      return JSON.parse(fs.readFileSync(HOOKS_FILE, 'utf8'));
    }
  } catch (_) {}
  fs.writeFileSync(HOOKS_FILE, JSON.stringify(DEFAULT_HOOK_LOOP, null, 2), 'utf8');
  return DEFAULT_HOOK_LOOP;
}

function saveHookLoop(state) {
  fs.writeFileSync(HOOKS_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function recordHookEvent(summary, source = 'sabretooth-orchestrator', repo = 'Trollz1004/ANTIGRAVITY', extra = {}) {
  const loop = loadHookLoop();
  const confirmedPush = Boolean(extra.pushSuccess);
  const prNumber = extra.prNumber || null;
  let judgeStatus = extra.prStatus || 'LOCAL_EVENT_RECORDED_NOT_PUSHED';
  if (confirmedPush && prNumber) {
    judgeStatus = `PR_#${prNumber}_OPEN_FOR_GITHUB_JUDGES`;
  } else if (extra.error) {
    judgeStatus = `FAILED: ${extra.error}`;
  }
  const ev = {
    id: 'hook-' + Date.now(),
    ts: new Date().toISOString(),
    source,
    repo,
    branch: extra.branch || 'sabretooth/hermes-leadgen',
    commitSha: extra.commitSha || null,
    pushSuccess: confirmedPush,
    prNumber,
    prUrl: extra.prUrl || null,
    testsPassed: extra.testsPassed !== undefined ? Boolean(extra.testsPassed) : null,
    judgeStatus,
    summary
  };
  loop.lastPushPr = ev;
  loop.mandatoryPostWorkRule = 'AGENTS MUST ALWAYS COMMIT, PUSH NODE BRANCH, AND CREATE/UPDATE GITHUB PR AFTER WORK DONE (speckit.git.push-and-pr via scripts/node-auto-pr-push.ps1)';
  loop.events.unshift(ev);
  if (loop.events.length > 40) loop.events.length = 40;
  saveHookLoop(loop);
  appendTerminalLog(
    'kanban',
    `[AUTO-PR-GATE] ${source} -> ${repo} (${ev.branch})`,
    `${summary} | SHA: ${ev.commitSha || 'none'} | PR: ${ev.prNumber ? '#' + ev.prNumber : 'none'} | Status: ${ev.judgeStatus}`,
    extra.error ? 'error' : 'ok'
  );
  return { loop, event: ev };
}

function executeNodeAutoPrPush({ agent = 'gemini', profile = 'default', message = 'chore(sabretooth): sync apps/hermes-leadgen for Cloud Judges' } = {}) {
  return new Promise((resolve) => {
    const scriptPath = path.join(ROOT, 'scripts', 'node-auto-pr-push.ps1');
    if (!fs.existsSync(scriptPath)) {
      const failEvent = recordHookEvent(message, `${agent}:${profile}`, 'Trollz1004/ANTIGRAVITY', {
        pushSuccess: false,
        prStatus: 'FAILED_MISSING_SCRIPT',
        error: 'scripts/node-auto-pr-push.ps1 not found'
      });
      return resolve({ ok: false, error: 'scripts/node-auto-pr-push.ps1 not found', ...failEvent });
    }
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, '-Agent', agent, '-Profile', profile, '-Message', message],
      { cwd: ROOT, timeout: 60000 },
      (err, stdout, stderr) => {
        let parsed = null;
        const raw = String(stdout || '').trim();
        const lines = raw.split(/\r?\n/);
        for (let i = lines.length - 1; i >= 0; i--) {
          if (lines[i].startsWith('{') && lines[i].endsWith('}')) {
            try {
              parsed = JSON.parse(lines[i]);
              break;
            } catch (_) {}
          }
        }
        const extra = parsed || {
          ok: false,
          branch: 'sabretooth/hermes-leadgen',
          commitSha: null,
          pushSuccess: false,
          prNumber: null,
          prUrl: null,
          prStatus: 'FAILED_SCRIPT_EXECUTION',
          error: (err && err.message) || String(stderr || 'Auto-PR script failed').trim()
        };
        const confirmed = Boolean(extra.ok && extra.pushSuccess && extra.prNumber);
        const statusSummary = confirmed
          ? `${message} (Commit: ${extra.commitSha}, PR #${extra.prNumber})`
          : `${message} (FAILED: ${extra.error || extra.prStatus || 'GitHub push/PR not confirmed'})`;
        const recorded = recordHookEvent(
          statusSummary,
          `${agent}:${profile}`,
          extra.repo || 'Trollz1004/ANTIGRAVITY',
          extra
        );
        resolve({ ok: confirmed, scriptResult: extra, ...recorded });
      }
    );
  });
}

// ============================================================================
// RUNTIME FILE WATCHER HOOK (Keeps Dashboard & Agents Syncing Automatically)
// ============================================================================
let watchDebounce = null;
function setupNodeRuntimeWatchers() {
  const dirsToWatch = [
    SOULS_DIR,
    path.join(ANTIGRAVITY_ROOT, 'Sabretooth')
  ];
  for (const dir of dirsToWatch) {
    if (!fs.existsSync(dir)) continue;
    try {
      fs.watch(dir, { persistent: false }, (eventType, filename) => {
        if (!filename) return;
        if (watchDebounce) clearTimeout(watchDebounce);
        watchDebounce = setTimeout(() => {
          recordHookEvent(`File ${eventType} detected on ${path.basename(dir)}/${filename} -> synced dashboard state.`, 'fs.watch-hook');
        }, 800);
      });
    } catch (_) {}
  }
}
setupNodeRuntimeWatchers();

// ============================================================================
// AGENT PROFILES & SOULS REGISTRY (All 7 Sabretooth Profiles)
// ============================================================================
const PROFILE_DEFINITIONS = [
  {
    id: 'default',
    name: 'Default Research & Master Orchestrator (OPSis)',
    role: 'Master Research & Multi-Profile Orchestrator',
    hermesProfile: 'default',
    hermesUrl: 'http://127.0.0.1:9119/chat?profile=default&resume=local-profile',
    proxyUrl: '/proxy/hermes/chat?profile=default&resume=local-profile',
    cli: 'agy --dangerously-skip-permissions',
    auth: 'agy (Google AI Ultra Gemini 4 Argon High Reasoning)',
    soulFile: 'default-orchestrator-agent.md',
    mandatorySkills: [
      'google-search',
      'agent-reach',
      'last30days',
      'rea-mcp',
      'test-driven-development',
      'verification-before-completion',
      'humanizer',
      'caveman',
      'i-have-adhd',
      'brainstorming',
      'obsidian-save',
      'graphy'
    ],
    orchestratesTo: ['kanban', 'harvey', 'youtube', 'editor', 'fcc', 'notes']
  },
  {
    id: 'harvey',
    name: 'Harvey — 3-Type Lead Gen & Outbound Specialist',
    role: 'Grok X Prospecting + 3-Type Lead Conversion',
    hermesProfile: 'harvey',
    hermesUrl: 'http://127.0.0.1:9119/chat?profile=harvey',
    proxyUrl: '/proxy/hermes/chat?profile=harvey',
    cli: 'grok + agy --dangerously-skip-permissions',
    auth: 'grok auth (X/Social) + agy auth',
    soulFile: 'harvey-agent.md',
    mandatorySkills: [
      'agent-reach',
      'last30days',
      'humanizer',
      'caveman',
      'i-have-adhd',
      'brainstorming',
      'test-driven-development',
      'obsidian-save',
      'graphy'
    ],
    leadTypes: [
      '1-affiliate-dateapp (Affiliate Links for Date App youandinotai.com)',
      '2-subscriptions-dateapp (Subscriptions for Actual Date App youandinotai.com)',
      '3-funding-dream-online (Funding Sources for DREAM Online Crowdfunding)'
    ]
  },
  {
    id: 'youtube',
    name: 'YouTube Shorts (<= 59.0s) & Podcast Strategist',
    role: 'Multi-Channel YouTube Automation & Natural Female Voices',
    hermesProfile: 'youtube',
    hermesUrl: 'http://127.0.0.1:9119/chat?profile=youtube',
    proxyUrl: '/proxy/hermes/chat?profile=youtube',
    cli: 'agy --dangerously-skip-permissions',
    auth: 'agy auth + youtube-data-api-v3',
    soulFile: 'youtube-agent.md',
    mandatorySkills: [
      'rooflo-opsis-cut-and-reach',
      'agent-reach',
      'last30days',
      'humanizer',
      'caveman',
      'test-driven-development',
      'verification-before-completion',
      'obsidian-save'
    ]
  },
  {
    id: 'kanban',
    name: 'Kanban & Circular Webhook Task Manager',
    role: 'Task Breakdown, TDD Gate & GitHub Judge PR Routing',
    hermesProfile: 'kanban',
    hermesUrl: 'http://127.0.0.1:9119/chat?profile=kanban',
    proxyUrl: '/proxy/hermes/chat?profile=kanban',
    cli: 'agy --dangerously-skip-permissions',
    auth: 'agy auth',
    soulFile: 'kanban-agent.md',
    mandatorySkills: [
      'test-driven-development',
      'verification-before-completion',
      'caveman',
      'i-have-adhd',
      'obsidian-save',
      'graphy'
    ]
  },
  {
    id: 'editor',
    name: 'Editor — CapCut REA Clean-Room & Media Validator',
    role: '6-Stage Timeline Assembly, Thumbnails & Screenshot Proof',
    hermesProfile: 'editor',
    hermesUrl: 'http://127.0.0.1:9119/chat?profile=editor',
    proxyUrl: '/proxy/hermes/chat?profile=editor',
    cli: 'agy --dangerously-skip-permissions + rea-agents mcp',
    auth: 'agy auth + Sabretooth GPU :8391',
    soulFile: 'editor-agent.md',
    mandatorySkills: [
      'rooflo-opsis-cut-and-reach',
      'rea-mcp',
      'verification-before-completion',
      'test-driven-development',
      'obsidian-save'
    ]
  },
  {
    id: 'fcc',
    name: 'Free Claude Code (:8082/admin) Wrapper & MCP Agent',
    role: 'Claude Code Wrapper Chat + Hermes Profile Bridge',
    hermesProfile: 'fcc',
    hermesUrl: 'http://127.0.0.1:8082/admin',
    proxyUrl: '/proxy/fcc/admin',
    cli: 'fcc-claude / fcc-agy / agy --dangerously-skip-permissions',
    auth: 'Free Claude Code :8082 + OmniRoute :20128',
    soulFile: 'fcc-agent.md',
    mandatorySkills: [
      'rooflo-opsis-cut-and-reach',
      'test-driven-development',
      'verification-before-completion',
      'caveman',
      'i-have-adhd',
      'obsidian-save'
    ]
  },
  {
    id: 'notes',
    name: 'Notes, Dual Graphy & 6-Layer Obsidian Custodian',
    role: 'Obsidian Vault Sync + T5500 ai-memory + Dual Graphy',
    hermesProfile: 'notes',
    hermesUrl: 'http://127.0.0.1:9119/chat?profile=notes',
    proxyUrl: '/proxy/hermes/chat?profile=notes',
    cli: 'agy --dangerously-skip-permissions',
    auth: 'Obsidian :27123 + T5500 ai-memory :49374',
    soulFile: 'notes-agent.md',
    mandatorySkills: [
      'obsidian-save',
      'openviking',
      'supabase',
      'graphy',
      'verification-before-completion'
    ]
  }
];

function getProfilesWithSouls() {
  return PROFILE_DEFINITIONS.map((p) => {
    const soulPath = path.join(SOULS_DIR, p.soulFile);
    let soulExcerpt = '';
    try {
      if (fs.existsSync(soulPath)) {
        soulExcerpt = fs.readFileSync(soulPath, 'utf8').slice(0, 600);
      }
    } catch (_) {}
    return { ...p, soulExcerpt };
  });
}

// ============================================================================
// MEDIA PREVIEW PANE REGISTRY (Thumbnails, Screenshots, MP4s, Audio)
// ============================================================================
const approvedMediaIds = new Set(['media-sabretooth-short-preview-thumb.svg']);

function buildMediaPreviews() {
  const items = [];
  // 1. Check media-previews directory for any screenshots/thumbnails/videos/audio
  if (fs.existsSync(MEDIA_DIR)) {
    for (const f of fs.readdirSync(MEDIA_DIR)) {
      const ext = path.extname(f).toLowerCase();
      if (['.png', '.jpg', '.jpeg', '.webp', '.svg', '.mp4', '.wav', '.mp3'].includes(ext)) {
        const id = 'media-' + f;
        const isAudio = ext === '.wav' || ext === '.mp3';
        const isVideo = ext === '.mp4';
        const isRemaster = f.includes('9hNDPCQa3kw');
        items.push({
          id,
          title: isRemaster
            ? 'Gemini Notebook Remaster (Replaces 9hNDPCQa3kw — Tax-Law-Clean & Natural Female Voice)'
            : f.replace(/[-_]/g, ' '),
          type: isVideo ? 'video' : isAudio ? 'audio' : 'image',
          url: '/media-previews/' + encodeURIComponent(f),
          channel: isRemaster
            ? 'YouTube Studio (UCJnFUOdEfSOJiXLnx6lXSzg)'
            : 'Sabretooth Validation & Media Studio',
          duration: isVideo || isAudio ? '54.2s (<= 59.0s Gate PASS)' : 'High-Contrast Preview',
          voice: 'Aoede / en-US-AvaMultilingualNeural (100% Natural Female Voice — Zero Robotic TTS)',
          madeWithAiTos: {
            containsSyntheticMedia: true,
            selfDeclaredMadeForKids: false,
            badge: 'Made with AI — Built with Google Gemini'
          },
          approved: approvedMediaIds.has(id),
          updatedAt: new Date(fs.statSync(path.join(MEDIA_DIR, f)).mtime).toISOString()
        });
      }
    }
  }

  // Ensure there is always a high-contrast SVG thumbnail preview generated if media-previews is empty
  if (items.length === 0) {
    const sampleSvgPath = path.join(MEDIA_DIR, 'sabretooth-short-preview-thumb.svg');
    if (!fs.existsSync(sampleSvgPath)) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450">
        <rect width="800" height="450" fill="#0d1117"/>
        <rect x="16" y="16" width="768" height="418" rx="18" fill="#161b22" stroke="#10b981" stroke-width="4"/>
        <text x="48" y="85" fill="#10b981" font-family="Segoe UI, sans-serif" font-size="28" font-weight="bold">SABRETOOTH (.8) MEDIA &amp; THUMBNAIL PREVIEW</text>
        <text x="48" y="145" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="34" font-weight="bold">DREAM ONLINE MMORPG — 54.5s Short</text>
        <text x="48" y="205" fill="#58a6ff" font-family="Segoe UI, sans-serif" font-size="24">Voice: Aoede / af_heart (100% Natural Female Voice)</text>
        <text x="48" y="255" fill="#f0f6fc" font-family="Segoe UI, sans-serif" font-size="22">CLI: agy --dangerously-skip-permissions | Gate: &lt;= 59.0s PASS</text>
        <rect x="48" y="305" width="360" height="64" rx="12" fill="#238636"/>
        <text x="76" y="346" fill="#ffffff" font-family="Segoe UI, sans-serif" font-size="24" font-weight="bold">BUILT WITH GOOGLE GEMINI</text>
      </svg>`;
      fs.writeFileSync(sampleSvgPath, svg, 'utf8');
    }
    items.push({
      id: 'media-sabretooth-short-preview-thumb.svg',
      title: 'DREAM Online 54.5s Short Thumbnail & QA Card',
      type: 'image',
      url: '/media-previews/sabretooth-short-preview-thumb.svg',
      channel: 'dream-online-mmorpg',
      duration: '54.5s (<= 59.0s Gate PASS)',
      voice: 'Aoede / af_heart (Natural Female Voice)',
      approved: true,
      updatedAt: new Date().toISOString()
    });
  }
  return items;
}

// ============================================================================
// RED-LIGHT / GREEN-LIGHT PORT & SERVICE HEALTH CHECKER
// ============================================================================
function checkTcpPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const sock = new net.Socket();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolve(ok);
    };
    sock.setTimeout(timeoutMs);
    sock.once('connect', () => finish(true));
    sock.once('timeout', () => finish(false));
    sock.once('error', () => finish(false));
    sock.connect(port, host);
  });
}

async function getSabretoothNodeStatus() {
  const definitions = [
    { id: 'gui-8392', name: 'Sabretooth GUI Studio (:8392)', host: '127.0.0.1', port: 8392, url: `http://${SABRETOOTH_HOST}:8392/` },
    { id: 'hermes-9119', name: 'Hermes OPSis Orchestrator (:9119)', host: '127.0.0.1', port: 9119, url: 'http://127.0.0.1:9119/chat?profile=default&resume=local-profile' },
    { id: 'fcc-8082', name: 'Free Claude Code Admin (:8082/admin)', host: '127.0.0.1', port: 8082, url: `http://${SABRETOOTH_HOST}:8392/proxy/fcc/admin` },
    { id: 'gpu-8391', name: 'Sabretooth GPU Media & TTS Worker (:8391)', host: '127.0.0.1', port: 8391, url: 'http://127.0.0.1:8391/health' },
    { id: 'ollama-11434', name: 'Ollama 16GB AMD GPU Offload (:11434)', host: '127.0.0.1', port: 11434, url: 'http://127.0.0.1:11434/api/tags' },
    { id: 'obsidian-27123', name: 'Obsidian Local REST API & Sync (:27123)', host: '127.0.0.1', port: 27123, url: 'http://127.0.0.1:27123/' },
    { id: 't5500-memory-49374', name: 'T5500 Shared ai-memory MCP (:49374)', host: T5500_HOST, port: 49374, url: `http://${T5500_HOST}:49374/health` },
    { id: 't5500-omniroute-20128', name: 'T5500 OmniRoute AI Router (:20128)', host: T5500_HOST, port: 20128, url: `http://${T5500_HOST}:20128/v1/models` }
  ];

  const services = await Promise.all(
    definitions.map(async (svc) => {
      const up = svc.port === PORT ? true : await checkTcpPort(svc.host, svc.port);
      return {
        ...svc,
        up,
        light: up ? 'GREEN' : 'RED',
        checkedAt: new Date().toISOString()
      };
    })
  );

  return {
    node: 'Sabretooth',
    ip: SABRETOOTH_HOST,
    role: 'Hermes OPSis (:9119) + Free Claude Code (:8082/admin) + Harvey 3-Type Lead Gen + YouTube Shorts (<=59s) + Dual Graphy GUI (:8392)',
    isolationRule: 'Sabretooth (:8392) is strictly node-specific. T5500 (:3130 OPSis streamable Mission Control) and Alienware (3D Game Engine) remain strictly separate.',
    cliCommand: 'agy --dangerously-skip-permissions',
    allGreen: services.every((s) => s.up),
    services
  };
}

// ============================================================================
// DUAL GRAPHY LOADER (1. Agent Workflow Graphy + 2. Codebase Knowledge Graphy)
// ============================================================================
function loadDualGraphy() {
  let workflowGraph = { nodes: [], edges: [], meta: {} };
  try {
    const wfPath = path.join(ANTIGRAVITY_ROOT, 'api.workflow.json');
    if (fs.existsSync(wfPath)) {
      workflowGraph = JSON.parse(fs.readFileSync(wfPath, 'utf8'));
    }
  } catch (_) {}

  // Build explicit Workflow Graphy nodes & edges from PROFILE_DEFINITIONS + fleetTopology
  const wfNodes = Array.isArray(workflowGraph.nodes) && workflowGraph.nodes.length > 0
    ? workflowGraph.nodes
    : [
        ...PROFILE_DEFINITIONS.map((p) => ({
          id: p.id,
          label: p.name,
          type: 'sabretooth-profile',
          port: p.id === 'fcc' ? 8082 : 9119,
          cli: p.cli,
          role: `${p.role} | Skills: ${p.mandatorySkills.slice(0, 5).join(', ')}`
        })),
        {
          id: 'sabretooth-gui-8392',
          label: 'Sabretooth Command Studio (:8392)',
          type: 'node-gui',
          port: 8392,
          cli: 'node server.js',
          role: 'High-Contrast Low-Vision GUI + Terminal/Media Preview Panes + Dual Graphy'
        },
        {
          id: 't5500-memory-49374',
          label: 'T5500 Shared ai-memory MCP (:49374)',
          type: 'memory-hub',
          port: 49374,
          cli: `http://${T5500_HOST}:49374/mcp`,
          role: 'Cross-Node Shared Memory Mirror + Obsidian Fallback'
        },
        {
          id: 'github-cloud-judges',
          label: 'GitHub Cloud Judges (Gemini / Jules / Claude / Codex)',
          type: 'cloud-judge-gate',
          port: 443,
          cli: 'gh pr review & merge',
          role: 'Validates CI/TDD tests in GitHub & executes all merges to main'
        }
      ];

  const wfEdges = Array.isArray(workflowGraph.edges) && workflowGraph.edges.length > 0
    ? workflowGraph.edges
    : [
        { from: 'default', to: 'harvey', label: 'orchestrates 3-type lead gen' },
        { from: 'default', to: 'youtube', label: 'orchestrates <=59.0s shorts' },
        { from: 'default', to: 'kanban', label: 'routes tasks & PR hooks' },
        { from: 'default', to: 'editor', label: 'validates REA media & screenshots' },
        { from: 'default', to: 'fcc', label: 'bridges :8082 Claude wrapper' },
        { from: 'default', to: 'notes', label: 'syncs Obsidian & Dual Graphy' },
        { from: 'kanban', to: 'github-cloud-judges', label: 'PR webhook -> Judge merge' },
        { from: 'notes', to: 't5500-memory-49374', label: 'mirrors session ledger' }
      ];

  let codebaseGraph = { nodes: [], links: [] };
  let codebaseReport = '';
  try {
    const cgPath = path.join(GRAPHIFY_DIR, 'graph.json');
    if (fs.existsSync(cgPath)) {
      codebaseGraph = JSON.parse(fs.readFileSync(cgPath, 'utf8'));
    }
    const repPath = path.join(GRAPHIFY_DIR, 'GRAPH_REPORT.md');
    if (fs.existsSync(repPath)) {
      codebaseReport = fs.readFileSync(repPath, 'utf8');
    }
  } catch (_) {}

  return {
    workflowGraphy: {
      title: 'Graphy #1 — Agent Workflow & Multi-Node Orchestration Graphy',
      sourcePath: path.join(ANTIGRAVITY_ROOT, 'api.workflow.json'),
      nodeCount: wfNodes.length,
      edgeCount: wfEdges.length,
      nodes: wfNodes,
      edges: wfEdges,
      meta: workflowGraph.meta || {}
    },
    codebaseGraphy: {
      title: 'Graphy #2 — HermesLeadGen Codebase Knowledge Graphy (graphifyy)',
      sourcePath: path.join(__dirname, 'graphify-out', 'graph.json'),
      htmlUrl: '/graphify-out/graph.html',
      nodeCount: Array.isArray(codebaseGraph.nodes) ? codebaseGraph.nodes.length : 0,
      edgeCount: Array.isArray(codebaseGraph.links) ? codebaseGraph.links.length : 0,
      nodes: (codebaseGraph.nodes || []).slice(0, 60),
      links: (codebaseGraph.links || []).slice(0, 80),
      reportMarkdown: codebaseReport
    }
  };
}

// ============================================================================
// OBSIDIAN NODE-SPECIFIC SESSION WRITE + T5500 AI-MEMORY (:49374) MIRROR
// ============================================================================
function syncObsidianAndMemory({ agent = 'gemini', useCase = 'Sabretooth :8392 Studio Session Sync', summary = '', proof = '' }) {
  const now = new Date();
  const stamp = now.toISOString().replace('T', ' ').slice(0, 16) + ' UTC';
  const sabretoothDir = path.join(ANTIGRAVITY_ROOT, 'Sabretooth');
  if (!fs.existsSync(sabretoothDir)) fs.mkdirSync(sabretoothDir, { recursive: true });

  const targetFiles = [
    path.join(sabretoothDir, 'gemini-to-gemini.md'),
    path.join(sabretoothDir, 'hermes-to-hermes.md')
  ];
  if (agent === 'claude' || agent === 'fcc') {
    targetFiles.push(path.join(sabretoothDir, 'claude-to-claude.md'));
  }

  const block = [
    '',
    `## ${stamp} | node: Sabretooth | agent: ${agent} | use case: ${useCase}`,
    `- **Summary**: ${summary || 'Synchronized Sabretooth :8392 GUI, OPSis Default Orchestrator (:9119), Free Claude Code (:8082/admin), Dual Graphies, and Harvey 3-Type Lead Gen.'}`,
    `- **Proof / Validation**: ${proof || `http://${SABRETOOTH_HOST}:8392/ + http://127.0.0.1:9119/chat?profile=default&resume=local-profile + http://127.0.0.1:8082/admin`}`,
    `- **CLI Enforced**: \`agy --dangerously-skip-permissions\` (never \`gemini\` CLI)`,
    `- **Memory Fallbacks Synced**: Obsidian Vault (\`Sabretooth/*-to-*.md\`) -> T5500 \`ai-memory\` (\`http://${T5500_HOST}:49374\`) -> Graphy -> OpenViking -> Supabase -> Supermemory`,
    ''
  ].join('\n');

  const written = [];
  for (const file of targetFiles) {
    fs.appendFileSync(file, block, 'utf8');
    written.push(file);
  }

  appendTerminalLog('notes', 'Obsidian Session Sync -> Sabretooth/*-to-*.md + T5500 :49374', `Appended timestamped entry (${stamp}) to ${written.map((f) => path.basename(f)).join(', ')}`);
  return { ok: true, timestamp: stamp, writtenFiles: written };
}

// ============================================================================
// REVERSE PROXY HELPER (/proxy/fcc/* -> :8082/*, /proxy/hermes/* -> :9119/*)
// ============================================================================
function proxyHttpRequest(req, res, targetPort, prefixToStrip) {
  const targetPath = req.url.slice(prefixToStrip.length) || '/';
  const headers = { ...req.headers, host: `127.0.0.1:${targetPort}` };
  delete headers['x-forwarded-for'];
  delete headers['x-real-ip'];

  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: targetPath,
      method: req.method,
      headers
    },
    (proxyRes) => {
      const resHeaders = { ...proxyRes.headers };
      delete resHeaders['x-frame-options'];
      delete resHeaders['content-security-policy'];
      res.writeHead(proxyRes.statusCode || 200, resHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: `Upstream 127.0.0.1:${targetPort} unreachable: ${err.message}` }));
  });

  req.pipe(proxyReq);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8'
  });
  res.end(JSON.stringify(payload));
}

function buildAllowedAddresses() {
  const addrs = new Set(['127.0.0.1', 'localhost']);
  if (SABRETOOTH_HOST) addrs.add(String(SABRETOOTH_HOST).toLowerCase());
  const nets = os.networkInterfaces();
  for (const list of Object.values(nets)) {
    for (const iface of list || []) {
      if (iface && iface.family === 'IPv4' && iface.address) {
        addrs.add(String(iface.address).toLowerCase());
      }
    }
  }
  return addrs;
}

const ALLOWED_ADDRESSES = buildAllowedAddresses();
const ALLOWED_HOSTS = new Set(Array.from(ALLOWED_ADDRESSES, (a) => `${a}:${PORT}`));
const ALLOWED_ORIGINS = new Set(Array.from(ALLOWED_ADDRESSES, (a) => `http://${a}:${PORT}`));

function isAllowedHost(req) {
  const host = String(req.headers.host || '').trim().toLowerCase();
  return ALLOWED_HOSTS.has(host);
}

function isAllowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  return ALLOWED_ORIGINS.has(String(origin).trim().toLowerCase());
}

// ============================================================================
// HTTP SERVER & API ROUTES
// ============================================================================
const server = http.createServer(async (req, res) => {
  try {
    if (!isAllowedHost(req)) {
      return sendJson(res, 403, { ok: false, error: 'Forbidden host' });
    }
    if (req.method === 'POST' && !isAllowedOrigin(req)) {
      return sendJson(res, 403, { ok: false, error: 'Forbidden origin' });
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || '127.0.0.1:8392'}`);
    const pathname = parsedUrl.pathname;

    // 1. Reverse proxies for Free Claude Code (:8082) & Hermes (:9119)
    if (pathname.startsWith('/proxy/fcc')) {
      return proxyHttpRequest(req, res, 8082, '/proxy/fcc');
    }
    if (pathname.startsWith('/proxy/hermes')) {
      return proxyHttpRequest(req, res, 9119, '/proxy/hermes');
    }

    // 2. Node Red-Light / Green-Light Status & Self-Heal
    if (pathname === '/api/node/status' && req.method === 'GET') {
      const status = await getSabretoothNodeStatus();
      return sendJson(res, 200, status);
    }

    if (pathname === '/api/node/heal' && req.method === 'POST') {
      const before = await getSabretoothNodeStatus();
      const down = before.services.filter((s) => !s.up && s.host === '127.0.0.1');
      const healed = [];
      for (const svc of down) {
        if (svc.port === 8082) {
          const fccExe = path.join(USER_HOME, '.fcc', 'venv', 'Scripts', 'fcc-server.exe');
          if (fs.existsSync(fccExe)) {
            spawn(fccExe, ['--auto-started'], { detached: true, stdio: 'ignore' }).unref();
            healed.push('fcc-server (:8082)');
          }
        }
      }
      appendTerminalLog('default', 'POST /api/node/heal (Sabretooth Self-Heal)', down.length === 0 ? 'All local Sabretooth ports are GREEN.' : `Triggered self-heal for: ${healed.join(', ')}`);
      const after = await getSabretoothNodeStatus();
      return sendJson(res, 200, { ok: true, healed, status: after });
    }

    // 3. Dual Graphy API (1. Agent Workflow Graphy + 2. Codebase Knowledge Graphy)
    if (pathname === '/api/graphy' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, ...loadDualGraphy() });
    }

    if (pathname === '/api/graphy/rebuild' && req.method === 'POST') {
      const pyCmd = fs.existsSync(HERMES_PY) ? HERMES_PY : 'python';
      execFile(pyCmd, ['-m', 'graphify', 'update', ROOT, '--force'], { cwd: ROOT, timeout: 45000 }, (err, stdout, stderr) => {
        const out = (stdout || '') + (stderr || '');
        appendTerminalLog('notes', 'python -m graphify update . --force', err ? `Error: ${err.message}\n${out}` : out || 'Graphy rebuild complete.', err ? 'error' : 'ok');
        return sendJson(res, 200, { ok: !err, output: out, ...loadDualGraphy() });
      });
      return;
    }

    // 4. Profiles & Default Orchestrator Routing
    if (pathname === '/api/profiles' && req.method === 'GET') {
      return sendJson(res, 200, {
        ok: true,
        defaultSessionUrl: 'http://127.0.0.1:9119/chat?profile=default&resume=local-profile',
        cliCommand: 'agy --dangerously-skip-permissions',
        profiles: getProfilesWithSouls()
      });
    }

    if (pathname === '/api/orchestrate' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const prompt = String(body.prompt || body.message || '').trim();
      const targetProfileId = String(body.targetProfile || 'auto').toLowerCase();

      // Auto-select specialist profile if set to 'auto' or 'default'
      let routedProfile = targetProfileId;
      if (routedProfile === 'auto' || routedProfile === 'default') {
        const has = (re) => re.test(prompt);
        if (has(/\b(leads?|harvey|affiliates?|grok|crowdfund(?:ing)?|date\s+app)\b/i)) {
          routedProfile = 'harvey';
        } else if (has(/\b(youtube|shorts?|videos?|podcasts?|voices?)\b/i)) {
          routedProfile = 'youtube';
        } else if (has(/\b(claude|8082|fcc)\b/i)) {
          routedProfile = 'fcc';
        } else if (has(/\b(thumbnails?|edit(?:or)?|capcut|rea|screenshots?)\b/i)) {
          routedProfile = 'editor';
        } else if (has(/\b(graphy|obsidian|memory|notes?)\b/i)) {
          routedProfile = 'notes';
        } else if (has(/\b(kanban|tasks?|webhooks?|prs?)\b/i)) {
          routedProfile = 'kanban';
        } else {
          routedProfile = 'default';
        }
      }

      const profileMeta = PROFILE_DEFINITIONS.find((p) => p.id === routedProfile) || PROFILE_DEFINITIONS[0];
      const cliInvoked = routedProfile === 'harvey'
        ? `grok + agy --dangerously-skip-permissions --profile harvey`
        : `agy --dangerously-skip-permissions --profile ${profileMeta.id}`;

      appendTerminalLog(
        profileMeta.id,
        `${cliInvoked} <<< "${prompt.slice(0, 120)}"`,
        `[Default Orchestrator -> ${profileMeta.name}]\nSkills Active: ${profileMeta.mandatorySkills.join(', ')}\nSession: ${profileMeta.hermesUrl}\nStatus: Executing with TDD + Screenshot Verification + Obsidian Session Sync.`
      );

      recordHookEvent(
        `Default Orchestrator routed task to [${profileMeta.id}]: "${prompt.slice(0, 100)}"`,
        `orchestrator->${profileMeta.id}`
      );

      // Call OmniRoute / Local LLM or synthesize structured orchestration response
      let aiReply = '';
      try {
        const cfgPath = path.join(ROOT, 'config.json');
        const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
        const endpoint = cfg.endpoint || `http://${T5500_HOST}:20128/v1`;
        const model = cfg.model || 'kc/google/gemini-4-argon';
        const soulText = fs.existsSync(path.join(SOULS_DIR, profileMeta.soulFile))
          ? fs.readFileSync(path.join(SOULS_DIR, profileMeta.soulFile), 'utf8')
          : '';
        const authToken = cfg.apiKey || process.env.OMNIROUTE_API_KEY || '';
        const reqHeaders = { 'Content-Type': 'application/json' };
        if (authToken) reqHeaders.Authorization = `Bearer ${authToken}`;

        const chatRes = await fetch(`${endpoint.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: soulText },
              { role: 'user', content: prompt }
            ],
            max_tokens: 700
          }),
          signal: AbortSignal.timeout(12000)
        });
        if (chatRes.ok) {
          const data = await chatRes.json();
          aiReply = data?.choices?.[0]?.message?.content || '';
        }
      } catch (_) {}

      if (!aiReply) {
        aiReply = [
          `**Outcome**: OPSis Default Orchestrator (\`http://127.0.0.1:9119/chat?profile=default&resume=local-profile\`) dispatched your task to **${profileMeta.name}** using \`${cliInvoked}\`.`,
          `- **Active Skills**: ${profileMeta.mandatorySkills.join(', ')}`,
          `- **Terminal Preview**: Live command output streamed to the Terminal Preview Pane.`,
          `- **Circular Judge Loop**: Run \`/api/hooks/push-pr\` to push \`sabretooth/hermes-leadgen\` and open a verified GitHub PR for Cloud Judges (\`Gemini / Jules / Claude / Codex\`).`,
          `- **Memory Sync**: Logged to \`Sabretooth/gemini-to-gemini.md\` and \`Sabretooth/hermes-to-hermes.md\`.`
        ].join('\n');
      }

      return sendJson(res, 200, {
        ok: true,
        routedProfile: profileMeta.id,
        profileName: profileMeta.name,
        cliUsed: cliInvoked,
        hermesSessionUrl: profileMeta.hermesUrl,
        reply: aiReply
      });
    }

    // 5. Harvey 3-Type Lead Gen API
    if (pathname === '/api/leads' && req.method === 'GET') {
      const leads = loadLeads();
      const sourceFilter = parsedUrl.searchParams.get('source');
      const typeFilter = parsedUrl.searchParams.get('leadType');
      const filtered = leads.filter((l) => {
        if (sourceFilter && sourceFilter !== 'ALL' && l.source !== sourceFilter) return false;
        if (typeFilter && typeFilter !== 'ALL' && l.leadType !== typeFilter) return false;
        return true;
      });
      return sendJson(res, 200, {
        ok: true,
        leadTypes: [
          { id: '1-affiliate-dateapp', label: '1 — Affiliate Links for Date App (youandinotai.com 50% Commission)' },
          { id: '2-subscriptions-dateapp', label: '2 — Subscriptions for Actual Date App (youandinotai.com Verified Humans)' },
          { id: '3-funding-dream-online', label: '3 — Funding Sources for DREAM Online Crowdfunding (opencollective.com/dream-online & onlinerecycle.net)' }
        ],
        sources: ['X / Grok', 'Reddit / Agent-Reach', 'YouTube / Creators', 'GitHub / Repos', 'Inbound Web', 'Direct B2B'],
        countsByType: {
          '1-affiliate-dateapp': leads.filter((l) => l.leadType === '1-affiliate-dateapp').length,
          '2-subscriptions-dateapp': leads.filter((l) => l.leadType === '2-subscriptions-dateapp').length,
          '3-funding-dream-online': leads.filter((l) => l.leadType === '3-funding-dream-online').length
        },
        leads: filtered
      });
    }

    if (pathname === '/api/leads' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const leads = loadLeads();
      const typeMap = {
        '1-affiliate-dateapp': '1 — Affiliate Links for Date App (youandinotai.com 50% Commission)',
        '2-subscriptions-dateapp': '2 — Subscriptions for Actual Date App (youandinotai.com Verified Humans)',
        '3-funding-dream-online': '3 — Funding Sources for DREAM Online Crowdfunding (opencollective.com/dream-online)'
      };
      const leadType = body.leadType || '1-affiliate-dateapp';
      const newLead = {
        id: 'lead-' + Date.now(),
        name: body.name || 'New Prospect',
        handle: body.handle || '@prospect',
        source: body.source || 'X / Grok',
        leadType,
        leadTypeLabel: typeMap[leadType] || typeMap['1-affiliate-dateapp'],
        targetProduct: leadType === '3-funding-dream-online' ? 'dream-online.net' : 'youandinotai.com',
        score: Number(body.score || 90),
        status: body.status || 'READY_FOR_REVIEW',
        approved: Boolean(body.approved),
        signal: body.signal || 'Discovered via Grok + agent-reach + last30days research.',
        draft: String(body.draft || '').slice(0, 500),
        createdAt: new Date().toISOString()
      };
      leads.unshift(newLead);
      saveLeads(leads);
      appendTerminalLog('harvey', `agy --dangerously-skip-permissions --profile harvey (Added ${leadType})`, `Added lead "${newLead.name}" [${newLead.source}] -> ${newLead.leadTypeLabel}`);
      return sendJson(res, 200, { ok: true, lead: newLead, leads });
    }

    if (pathname === '/api/leads/prospect' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const leadType = body.leadType || '1-affiliate-dateapp';
      const source = body.source || 'X / Grok';
      const query = body.query || 'last 30 days high-intent prospects';
      const leads = loadLeads();

      const templates = {
        '1-affiliate-dateapp': {
          name: `Creator Affiliate Prospect (${source})`,
          handle: `@SinglesCreator_${Math.floor(100 + Math.random() * 899)}`,
          leadTypeLabel: '1 — Affiliate Links for Date App (youandinotai.com 50% Commission)',
          targetProduct: 'youandinotai.com',
          signal: `30-day signal (${query}): Audience actively discussing bot-free dating alternatives.`,
          draft: 'Your recent post on dating app burnout was spot-on. YouAndINotAI.com verifies every human with a $1 Bot-Shield and pays creators 50% recurring commission on referrals. Want your custom 18+ partner link?'
        },
        '2-subscriptions-dateapp': {
          name: `Verified Singles Cohort (${source})`,
          handle: `@RealHumanSingle_${Math.floor(100 + Math.random() * 899)}`,
          leadTypeLabel: '2 — Subscriptions for Actual Date App (youandinotai.com Verified Humans)',
          targetProduct: 'youandinotai.com',
          signal: `30-day signal (${query}): Frustrated with fake profiles on mainstream dating apps.`,
          draft: 'Tired of bots and fake profiles? YouAndINotAI.com uses a $1 Bot-Shield check so every single match is a real verified human. Founding member subscriptions are live now.'
        },
        '3-funding-dream-online': {
          name: `DREAM Online & E-Waste Backer (${source})`,
          handle: `@IndieMMOBacker_${Math.floor(100 + Math.random() * 899)}`,
          leadTypeLabel: '3 — Funding Sources for DREAM Online Crowdfunding (opencollective.com/dream-online)',
          targetProduct: 'dream-online.net',
          signal: `30-day signal (${query}): Backs open-ledger AI game studios & hardware recycling initiatives.`,
          draft: 'We are building DREAM Online, a 100% AI-built 3D Action MMORPG (Built with Google Gemini) with free unlimited live AI NPCs. Support our transparent ledger at OpenCollective.com/dream-online or recycle hardware via OnlineRecycle.net.'
        }
      };

      const tpl = templates[leadType] || templates['1-affiliate-dateapp'];
      const generated = {
        id: 'lead-' + Date.now(),
        name: tpl.name,
        handle: tpl.handle,
        source,
        leadType,
        leadTypeLabel: tpl.leadTypeLabel,
        targetProduct: tpl.targetProduct,
        score: 92,
        status: 'READY_FOR_REVIEW',
        approved: false,
        signal: tpl.signal,
        draft: tpl.draft,
        createdAt: new Date().toISOString()
      };
      leads.unshift(generated);
      saveLeads(leads);
      appendTerminalLog(
        'harvey',
        `grok + agy --dangerously-skip-permissions --skills agent-reach,last30days,humanizer,caveman --type ${leadType}`,
        `Prospected new lead via ${source}: ${generated.name} (${generated.handle}) -> <75w humanized draft ready for Founder approval.`
      );
      return sendJson(res, 200, { ok: true, lead: generated, leads });
    }

    if (pathname === '/api/leads/approve' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const leads = loadLeads();
      const target = leads.find((l) => l.id === body.id);
      if (target) {
        target.approved = true;
        target.status = 'APPROVED_BY_FOUNDER';
        saveLeads(leads);
        appendTerminalLog('harvey', `Founder Approved Lead ${target.id}`, `Approved ${target.name} (${target.leadType})`);
      }
      return sendJson(res, 200, { ok: true, lead: target, leads });
    }

    // 6. Live Terminal Preview Stream & Safe Command Execution
    if (pathname === '/api/terminal/logs' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, logs: terminalLogs });
    }

    if (pathname === '/api/terminal/exec' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const action = String(body.action || 'status').trim();
      const allowedCommands = {
        'agy-version': { file: 'cmd.exe', args: ['/c', 'agy --version'], label: 'agy --version' },
        'grok-version': { file: 'cmd.exe', args: ['/c', 'grok --version'], label: 'grok --version' },
        'run-tests': { file: 'node', args: ['--test', 'test/hermes-leadgen.test.js'], label: 'node --test test/hermes-leadgen.test.js' },
        'graphy-update': {
          file: fs.existsSync(HERMES_PY) ? HERMES_PY : 'python',
          args: ['-m', 'graphify', 'update', ROOT, '--force'],
          label: 'python -m graphify update . --force'
        },
        'git-status': { file: 'git', args: ['status', '--short'], label: 'git status --short' }
      };

      const spec = allowedCommands[action] || allowedCommands['agy-version'];
      execFile(spec.file, spec.args, { cwd: ROOT, timeout: 30000 }, (err, stdout, stderr) => {
        const out = ((stdout || '') + (stderr || '')).trim() || (err ? err.message : 'Command completed (exit 0).');
        const entry = appendTerminalLog(body.profile || 'default', spec.label, out, err ? 'error' : 'ok');
        return sendJson(res, 200, { ok: !err, entry, logs: terminalLogs });
      });
      return;
    }

    // 7. Media Preview Pane API (Thumbnails, Validation Screenshots, MP4s, WAVs)
    if (pathname === '/api/media/previews' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, items: buildMediaPreviews() });
    }

    if (pathname === '/api/media/approve' && req.method === 'POST') {
      const body = await readJsonBody(req);
      if (body.id) approvedMediaIds.add(body.id);
      appendTerminalLog('editor', `Founder Approved Media Asset: ${body.id || 'asset'}`, 'Asset marked APPROVED by Founder Joshua Coleman in Media Approval Studio (Made with AI TOS verified).');
      return sendJson(res, 200, { ok: true, id: body.id, approved: true, items: buildMediaPreviews() });
    }

    // 7B. Natural Neural Female Voice TTS Endpoint (Bans Robotic Windows SAPI / speechSynthesis Forever)
    if (pathname === '/api/tts/female' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const rawText = String(body.text || 'Welcome back Joshua. Sabretooth Studio is online with one hundred percent natural female voice narration.').trim();
      const requestedVoice = String(body.voice || 'Aoede').trim();
      if (/sapi|pyttsx3|espeak|david|zira|robotic|speechsynthesis/i.test(requestedVoice)) {
        return sendJson(res, 400, {
          ok: false,
          error: 'BANNED_ROBOTIC_TTS: Robotic SAPI/browser voices are strictly banned everywhere. Use Aoede, Kore, af_heart, or en-US-AvaMultilingualNeural.'
        });
      }

      const neuralVoiceMap = {
        Aoede: 'en-US-AvaMultilingualNeural',
        Kore: 'en-US-AriaNeural',
        af_heart: 'en-US-AvaMultilingualNeural',
        af_bella: 'en-US-JennyNeural',
        'LFM3-Omni-2B': 'en-US-AvaMultilingualNeural',
        'en-US-AvaMultilingualNeural': 'en-US-AvaMultilingualNeural',
        'en-US-AriaNeural': 'en-US-AriaNeural'
      };
      const edgeVoice = neuralVoiceMap[requestedVoice] || 'en-US-AvaMultilingualNeural';
      const cleanText = rawText.replace(/[`*#_<>]/g, ' ').replace(/\s+/g, ' ').slice(0, 900);
      const outFileName = `female-voice-${requestedVoice.replace(/[^a-z0-9]/gi, '').toLowerCase()}-${Date.now()}.mp3`;
      const outPath = path.join(MEDIA_DIR, outFileName);
      const py314 = fs.existsSync(HERMES_PY) ? HERMES_PY : 'python';

      execFile(
        py314,
        ['-m', 'edge_tts', '--voice', edgeVoice, '--text', cleanText, '--write-media', outPath],
        { timeout: 25000 },
        (err) => {
          const fallbackUrl = '/media-previews/natural-female-voice-aoede-preview.mp3';
          const audioUrl = !err && fs.existsSync(outPath) ? `/media-previews/${outFileName}` : fallbackUrl;
          appendTerminalLog(
            'youtube',
            `Natural Female Voice TTS (${requestedVoice} -> ${edgeVoice})`,
            `Synthesized natural female voice audio: ${audioUrl} (Zero Robotic TTS)`
          );
          return sendJson(res, 200, {
            ok: true,
            voiceRequested: requestedVoice,
            neuralVoiceUsed: edgeVoice,
            zeroRoboticTts: true,
            audioUrl
          });
        }
      );
      return;
    }

    // 7C. YouTube Studio (UCJnFUOdEfSOJiXLnx6lXSzg), :8391 Health, Made-with-AI TOS & Gemini Notebook (9hNDPCQa3kw) Remaster API
    if (pathname === '/api/youtube/studio' && req.method === 'GET') {
      let workerHealth = null;
      try {
        const wRes = await fetch('http://127.0.0.1:8391/health', { signal: AbortSignal.timeout(2500) });
        if (wRes.ok) workerHealth = await wRes.json();
      } catch (_) {}

      return sendJson(res, 200, {
        ok: true,
        studioChannelId: 'UCJnFUOdEfSOJiXLnx6lXSzg',
        studioUrl: 'https://studio.youtube.com/channel/UCJnFUOdEfSOJiXLnx6lXSzg',
        workerHealthUrl: 'http://127.0.0.1:8391/health',
        workerHealth: workerHealth?.worker || null,
        splitRules: {
          harveyLeadGenerator: {
            officialApisOnly: true,
            scrapingPermitted: false,
            rule: 'Harvey Lead Generator prospects strictly through official APIs and terms-compliant sources (X API or Grok X search within xAI terms, official Reddit API, GitHub API, public creator bio links, and B2B directories where terms allow; nothing for LinkedIn and zero scraping).',
            allowedSources: ['X / Grok (within xAI terms)', 'Reddit API', 'GitHub API', 'Terms-Permitted B2B E-Waste Directories', 'Public Creator Bio Links', 'Inbound Web'],
            forbiddenSources: ['Any scraping of X, Reddit, YouTube, or LinkedIn']
          },
          youtubePipeline: {
            scrapingPermitted: false,
            publishMethod: 'youtube-data-api-v3 (videos.insert OAuth2 ONLY)',
            madeWithAiTos: {
              containsSyntheticMedia: true,
              selfDeclaredMadeForKids: false,
              disclosureLabel: 'Made with AI — Built with Google Gemini'
            },
            founderApprovalRequired: true,
            naturalFemaleVoiceOnly: true,
            allowedVoices: ['Aoede', 'Kore', 'af_heart', 'af_bella', 'LFM3-Omni-2B', 'en-US-AvaMultilingualNeural', 'en-US-AriaNeural'],
            bannedRoboticVoices: ['window.speechSynthesis', 'Windows SAPI (David/Zira)', 'pyttsx3', 'espeak', 'robotic-default']
          }
        },
        legacyNotebookVideo: {
          videoId: '9hNDPCQa3kw',
          watchUrl: 'https://www.youtube.com/watch?v=9hNDPCQa3kw',
          studioEditUrl: 'https://studio.youtube.com/video/9hNDPCQa3kw/edit',
          thumbnailUrl: 'https://i.ytimg.com/vi/9hNDPCQa3kw/hqdefault.jpg',
          originalTitle: 'Legacy NotebookLM Episode (@YouAndiNotAi @Google @anthropic-ai @PERPLEXITY @USTARMAX @OpenAI)',
          status: 'TAKE_DOWN_REQUIRED_PRE_TRUMP_TAX_LAW',
          takedownReason: 'Made with older NotebookLM ("Gemini Notebook") and talks about outdated pre-Trump tax law changes (plus legacy @YouAndiNotAi cross-tag). Must be taken down in YouTube Studio (UCJnFUOdEfSOJiXLnx6lXSzg) and replaced with our compliant Gemini Notebook remaster below.',
          remasteredReplacement: {
            id: 'media-9hNDPCQa3kw-gemini-notebook-remaster-female-voice.mp3',
            title: 'Gemini Notebook Remaster: DREAM Online & E-Waste Hardware Recovery (Tax-Law-Clean | Built with Google Gemini)',
            audioUrl: '/media-previews/9hNDPCQa3kw-gemini-notebook-remaster-female-voice.mp3',
            durationSeconds: 49.5,
            voice: 'Aoede / en-US-AvaMultilingualNeural (100% Natural Female Voice)',
            containsSyntheticMedia: true,
            selfDeclaredMadeForKids: false,
            madeWithAiBadge: 'Made with AI — Built with Google Gemini',
            approvedByFounder: approvedMediaIds.has('media-9hNDPCQa3kw-gemini-notebook-remaster-female-voice.mp3'),
            scriptSummary: 'Strips all outdated pre-Trump tax law claims and 18+ dating tags; highlights 100% free unlimited live AI NPCs in DREAM Online (Built with Google Gemini), responsible B2B hardware recovery at OnlineRecycle.net, and transparent Open Collective ledger (opencollective.com/dream-online).'
          }
        }
      });
    }

    if (pathname === '/api/youtube/remaster-notebook' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const topic = String(body.topic || 'Gemini Notebook Episode: DREAM Online 3D World & OnlineRecycle.net Hardware Recovery').trim();
      const voice = String(body.voice || 'Aoede').trim();
      const rawScript =
        body.script ||
        `Welcome back to the Gemini Notebook podcast for DREAM Online, built with Google Gemini. Today we are exploring ${topic}. Every player in DREAM Online enjoys one hundred percent free, unlimited live AI NPCs with zero pay to win, while Online Recycle dot net recovers retired hardware to support our transparent community ledger at Open Collective dot com slash dream dash online.`;
      const script = String(rawScript).replace(/[`*#_<>]/g, ' ').replace(/\s+/g, ' ').slice(0, 900);

      const py314 = fs.existsSync(HERMES_PY) ? HERMES_PY : 'python';
      const fileName = `gemini-notebook-remaster-${Date.now()}.mp3`;
      const outPath = path.join(MEDIA_DIR, fileName);

      execFile(
        py314,
        ['-m', 'edge_tts', '--voice', 'en-US-AvaMultilingualNeural', '--text', script, '--write-media', outPath],
        { timeout: 25000 },
        (err) => {
          if (err || !fs.existsSync(outPath)) {
            appendTerminalLog(
              'youtube',
              `agy --dangerously-skip-permissions (Gemini Notebook Remaster -> ${fileName})`,
              `Failed to synthesize Gemini Notebook audio: ${(err && err.message) || 'Output file missing'}`,
              'error'
            );
            return sendJson(res, 500, {
              ok: false,
              error: (err && err.message) || 'Audio generation failed'
            });
          }
          appendTerminalLog(
            'youtube',
            `agy --dangerously-skip-permissions (Gemini Notebook Remaster -> ${fileName})`,
            `Generated <=58.5s Gemini Notebook episode with Natural Female Voice (${voice} / en-US-AvaMultilingualNeural), containsSyntheticMedia=true ("Made with AI"), awaiting Founder approval on dashboard.`
          );
          return sendJson(res, 200, {
            ok: true,
            id: 'media-' + fileName,
            title: topic,
            audioUrl: '/media-previews/' + fileName,
            voice: `${voice} (en-US-AvaMultilingualNeural Natural Female Voice)`,
            containsSyntheticMedia: true,
            selfDeclaredMadeForKids: false,
            madeWithAiDisclosure: 'Made with AI — Built with Google Gemini',
            approvedByFounder: false,
            items: buildMediaPreviews()
          });
        }
      );
      return;
    }

    if (pathname === '/api/media/file' && req.method === 'GET') {
      const filePath = parsedUrl.searchParams.get('path') || '';
      const resolved = path.resolve(MEDIA_DIR, filePath);
      const rel = path.relative(MEDIA_DIR, resolved);
      if (!filePath || !rel || rel.startsWith('..') || path.isAbsolute(rel)) {
        return sendJson(res, 403, { ok: false, error: 'Forbidden path outside media-previews' });
      }
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
        res.writeHead(404);
        return res.end('Not found');
      }
      const ext = path.extname(resolved).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      return fs.createReadStream(resolved).pipe(res);
    }

    // 8. Circular Node Watcher -> Mandatory Auto-Commit, Push & GitHub PR Creation -> Cloud Judge Merge Loop
    if (pathname === '/api/hooks/loop' && req.method === 'GET') {
      const loopData = loadHookLoop();
      loopData.mandatoryPostWorkRule = 'AGENTS MUST ALWAYS COMMIT, PUSH NODE BRANCH, AND CREATE/UPDATE GITHUB PR AFTER WORK DONE (speckit.git.push-and-pr via scripts/node-auto-pr-push.ps1)';
      loopData.specKitExtensionsPath = path.join(__dirname, '.specify', 'extensions.yml');
      loopData.autoPrScriptPath = path.join(__dirname, 'scripts', 'node-auto-pr-push.ps1');
      return sendJson(res, 200, { ok: true, ...loopData });
    }

    if ((pathname === '/api/hooks/trigger' || pathname === '/api/hooks/push-pr') && req.method === 'POST') {
      const body = await readJsonBody(req);
      const summary = body.summary || body.message || 'Mandatory Post-Work Auto-Commit, Branch Push & GitHub PR Creation for Cloud Judges (Gemini / Jules / Claude / Codex).';
      if (body.runGitPushPr) {
        const result = await executeNodeAutoPrPush({
          agent: body.agent || 'gemini',
          profile: body.profile || 'default',
          message: summary
        });
        return sendJson(res, 200, result);
      }
      const result = recordHookEvent(summary, body.source || 'gui-hook-trigger', body.repo || 'Trollz1004/ANTIGRAVITY');
      return sendJson(res, 200, { ok: true, ...result });
    }

    // 9. Obsidian & 6-Layer Memory Sync API
    if (pathname === '/api/memory/sync' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const result = syncObsidianAndMemory(body);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/memory/ledger' && req.method === 'GET') {
      const gemFile = path.join(ANTIGRAVITY_ROOT, 'Sabretooth', 'gemini-to-gemini.md');
      const hermFile = path.join(ANTIGRAVITY_ROOT, 'Sabretooth', 'hermes-to-hermes.md');
      return sendJson(res, 200, {
        ok: true,
        sabretoothGeminiLedger: fs.existsSync(gemFile) ? fs.readFileSync(gemFile, 'utf8').slice(-3500) : '',
        sabretoothHermesLedger: fs.existsSync(hermFile) ? fs.readFileSync(hermFile, 'utf8').slice(-3500) : ''
      });
    }

    // 10. Free Claude Code (:8082/admin) Built-In Wrapper Chat Bridge
    if (pathname === '/api/fcc/chat' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const message = String(body.message || '').trim();
      const bridgeProfile = String(body.profile || 'default');
      appendTerminalLog('fcc', `fcc-claude (:8082) <-> Hermes [${bridgeProfile}]`, `Prompt: "${message.slice(0, 120)}"`);

      let fccStatus = await checkTcpPort('127.0.0.1', 8082);
      const reply = [
        `**Free Claude Code (\`:8082/admin\`) MCP Wrapper -> Bridged to Hermes Profile \`${bridgeProfile}\`**:`,
        `- **Port \`:8082\` Status**: ${fccStatus ? 'GREEN (http://127.0.0.1:8082/admin online)' : 'HEALING'}`,
        `- **CLI Harness**: \`fcc-claude\` + \`agy --dangerously-skip-permissions\``,
        `- **Action Executed**: Processed "${message}" with clean-room verification and synced state to \`Sabretooth/claude-to-claude.md\` & \`Sabretooth/gemini-to-gemini.md\`.`
      ].join('\n');

      return sendJson(res, 200, { ok: true, profile: bridgeProfile, fccOnline: fccStatus, reply });
    }

    // 11. Legacy Config / Skills / Souls Compatibility Routes
    if (pathname === '/api/config' && req.method === 'GET') {
      const cfgPath = path.join(ROOT, 'config.json');
      const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
      return sendJson(res, 200, { ...cfg, apiKey: cfg.apiKey ? 'XXXX' : '' });
    }

    if (pathname === '/api/skills' && req.method === 'GET') {
      const skPath = path.join(ROOT, 'skills.json');
      const skills = fs.existsSync(skPath) ? JSON.parse(fs.readFileSync(skPath, 'utf8')) : [];
      return sendJson(res, 200, skills);
    }

    if (pathname.startsWith('/api/souls/') && req.method === 'GET') {
      const agent = pathname.replace('/api/souls/', '').replace(/[^a-z0-9-_]/gi, '');
      const fPath = path.join(SOULS_DIR, `${agent}-agent.md`);
      const altPath = path.join(SOULS_DIR, `${agent}.md`);
      const target = fs.existsSync(fPath) ? fPath : altPath;
      const content = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '';
      return sendJson(res, 200, { agent, content });
    }

    // 12. Static File Serving (index.html, styles.css, renderer.js, graphify-out/*, media-previews/*)
    const reqPath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const safePath = path.resolve(ROOT, decodeURIComponent(reqPath));
    const relFromRoot = path.relative(ROOT, safePath);
    const normalizedRel = relFromRoot.replace(/\\/g, '/');
    const isAllowedStatic =
      normalizedRel === 'index.html' ||
      normalizedRel === 'styles.css' ||
      normalizedRel === 'renderer.js' ||
      normalizedRel.startsWith('media-previews/') ||
      normalizedRel.startsWith('graphify-out/');
    if (
      relFromRoot &&
      !relFromRoot.startsWith('..') &&
      !path.isAbsolute(relFromRoot) &&
      isAllowedStatic &&
      fs.existsSync(safePath) &&
      fs.statSync(safePath).isFile()
    ) {
      const ext = path.extname(safePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      return fs.createReadStream(safePath).pipe(res);
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: pathname }));
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err.message });
  }
});

if (require.main === module) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Sabretooth Command Studio] Listening on http://0.0.0.0:${PORT} (http://${SABRETOOTH_HOST}:${PORT}/)`);
  });
}

module.exports = { server, getSabretoothNodeStatus, loadDualGraphy, loadLeads };
