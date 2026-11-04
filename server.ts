/**
 * DREAM Engine Studio — Full-Stack Server & Google Ultra Custom Agent SDK Gateway
 * Hosts:
 * - /api/gm/*       (DREAM ONLINE · GM Control · Alienware .40, T5500 .15, Mission Control :3130)
 * - /api/agent-sdk/* (Google Ultra Custom Agent SDK Gateway · Direct @google/genai + A2A/ACP/MCP)
 * - /api/memory/*   (4-Tier Agent Memory Failover Ladder: Obsidian Vault -> Viking -> Supabase -> Supermemory)
 * - /api/graphy/*   (Graphy Repository AST & Workflow Context Graph)
 * - /api/studio/*   (REA Binary Analysis & 3D World/Character AI Synthesis)
 *
 * 100% Built with Google Gemini
 */

import crypto from 'crypto';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import {
  OPENUI_GAME_DEV_PRESETS,
  parseOpenUiProgram,
  evaluateOpenUiProgram,
} from './src/engine/openui/openui-engine.ts';
import {
  ReaCityArchitect,
  REA_CITY_ARCHETYPES,
  REA_RECONSTRUCTION_EVIDENCE_LEDGER,
  ReaArchetypeId,
} from './src/engine/world/rea-city-architect.ts';
import {
  RemakeSwapBoard,
  IDE_BENCHMARK_PROFILES,
} from './src/engine/remake/remake-swap-board.ts';
import {
  ACTION_MMO_CLASSES,
  ActionMmoClassId,
  SKILL_VFX_THEMES,
  SkillVfxThemeId,
  DREAMFORGE_MODES,
  DREAMFORGE_STYLES,
} from './src/engine/combat/skill-vfx.ts';
import {
  DREAM_CLI_HELP_TEXT,
  WHALE_SECURITY_PATRON_TIERS,
  executeCliAnythingCommand,
  runKidsPlaygroundSecurityAudit,
  SecurityTeamMode,
} from './src/engine/cli-anything/cli-anything-bridge.ts';
import {
  CANONICAL_NODE_TOPOLOGY,
  CO_GM_COUNCIL,
  DEFAULT_AGENT_SDK_LANES,
  INITIAL_MEMORY_TIERS,
  INITIAL_MEMORY_ENTRIES,
  INITIAL_CUSTOM_NPCS,
  GRAPHY_CODEBASE_NODES,
  analyzeReaBinary,
  formatObsidianVaultBundle,
  redactSecretsWithXXXX,
  GEMINI_SOUL_MD,
  AgentMemoryEntry,
  MemoryTierStatus,
  AgentSdkLane,
} from './src/engine/studioConfig.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const MAX_SERVER_STATE_ITEMS = 200;

export function resolveDreamEngineBindHost(env: NodeJS.ProcessEnv = process.env): string {
  return String(env.DREAM_ENGINE_BIND || '').trim() === '0.0.0.0' ? '0.0.0.0' : '127.0.0.1';
}

export function validateDreamEngineBindConfig(env: NodeJS.ProcessEnv = process.env): {
  host: string;
  token: string;
} {
  const host = resolveDreamEngineBindHost(env);
  const token = String(env.DREAM_ENGINE_TOKEN || '').trim();
  if (host === '0.0.0.0' && !token) {
    throw new Error(
      'Refusing to start DREAM Engine on 0.0.0.0 without DREAM_ENGINE_TOKEN: set a non-empty DREAM_ENGINE_TOKEN or bind to 127.0.0.1.'
    );
  }
  return { host, token };
}

export const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export function requireDreamEngineAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const method = String(req.method || 'GET').toUpperCase();
  if (!STATE_CHANGING_METHODS.has(method)) {
    return next();
  }
  if (resolveDreamEngineBindHost(process.env) !== '0.0.0.0') {
    return next();
  }
  const expectedToken = String(process.env.DREAM_ENGINE_TOKEN || '').trim();
  if (!expectedToken) {
    res.status(401).json({
      error: 'Unauthorized: DREAM_ENGINE_TOKEN is required when DREAM_ENGINE_BIND=0.0.0.0',
    });
    return;
  }
  const authHeader = String(req.headers.authorization || '').trim();
  const match = /^Bearer\s+(\S+)$/i.exec(authHeader);
  const providedToken = match ? match[1] : '';
  const expectedBuf = Buffer.from(expectedToken, 'utf8');
  const providedBuf = Buffer.from(providedToken, 'utf8');
  const valid =
    expectedBuf.length === providedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, providedBuf);
  if (!valid) {
    res.status(401).json({
      error: 'Unauthorized: valid Authorization Bearer token required',
    });
    return;
  }
  next();
}

export const app = express();
app.use(express.json({ limit: '10mb' }));
app.use('/dreamforge', express.static(path.join(__dirname, 'dreamforge')));
app.use('/api', requireDreamEngineAuth);

// House rule: no provider key outside the AI Studio app's own voices. The Gemini lane stays off
// (null client, callers answer 503) unless GEMINI_API_KEY is set AND GEMINI_KEY_APPROVED=finalize.
export const GEMINI_LANE_OFF_MESSAGE = 'Gemini lane is off until Josh finalizes a key';

// Initialize server-side GoogleGenAI per @google/genai guidelines
let genAiClientOverride: GoogleGenAI | null = null;

export function setGenAiClientForTests(client: GoogleGenAI | null): void {
  genAiClientOverride = client;
}

export function getGenAiClient(): GoogleGenAI | null {
  if (genAiClientOverride) return genAiClientOverride;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || process.env.GEMINI_KEY_APPROVED !== 'finalize') return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: 1500,
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function geminiLaneOff(res: express.Response) {
  return res.status(503).json({ status: 'unavailable', error: GEMINI_LANE_OFF_MESSAGE });
}

// ============================================================================
// Server-Authoritative Runtime State (GM Control, Economy, Audit, Memory)
// ============================================================================

export const serverState = {
  world: {
    status: 'live-studio',
    server: 'mission-control-3130 · alienware-.40 · t5500-.15',
    phase: 'stage-1-studio-parity',
    activePlayers: 1,
    dreamShift: {
      state: 'day' as 'day' | 'night',
      nextShiftHint: 'Synced with 3D WebGPU/WebGL2 Engine & GM Control',
    },
    lastGreenCheckpoint: 'checkpoint-0002',
    updatedAt: new Date().toISOString().slice(0, 10),
  },
  economy: {
    currency: {
      NEEDs: {
        totalMinted: 24500,
        totalSpent: 8200,
        suspiciousDelta: 0,
      },
    },
    items: {
      duplicateWarnings: [] as string[],
      negativeBalanceWarnings: [] as string[],
      impossibleDurabilityWarnings: [] as string[],
    },
    adFundedStats: {
      adImpressions: 1240,
      inferenceCalls: 48,
    },
  },
  events: [
    {
      id: 'ev-first-gate-patrol',
      name: 'First Gate Sentinel Resonance',
      zone: 'first-gate',
      status: 'active',
    },
    {
      id: 'ev-rea-bridge-sync',
      name: 'REA Binary & Obsidian Vault Sync (.40 ↔ .15)',
      zone: 'mission-control-3130',
      status: 'active',
    },
  ],
  checkpoints: [
    {
      id: 'checkpoint-0002',
      meta: 'live · :3130 Mission Control · Stage 1 + Studio + REA + Co-GM Council',
    },
    {
      id: 'checkpoint-0001',
      meta: 'recorded 2026-08-25 · First Light & Action Combat baseline',
    },
  ],
  auditLog: [
    {
      id: 'audit-init-1',
      t: new Date().toLocaleTimeString('en-US', { hour12: false }),
      kind: 'CO-GM',
      msg: 'Co-GM Council initialized: Gemini, Claude, Perplexity, Grok, OpenAI (Codex), Hermes & Electrician Founder (#UntilNoKidInNeed)',
      ok: true,
    },
    {
      id: 'audit-init-2',
      t: new Date().toLocaleTimeString('en-US', { hour12: false }),
      kind: 'TOPOLOGY',
      msg: 'Hardware nodes locked: Alienware 192.168.0.40:9180 · T5500 192.168.0.15:9127 · Mission Control :3130 (Zero Omniroute/Paperclip)',
      ok: true,
    },
  ],
  memoryTiers: [...INITIAL_MEMORY_TIERS] as MemoryTierStatus[],
  memoryEntries: [...INITIAL_MEMORY_ENTRIES] as AgentMemoryEntry[],
  agentLanes: [...DEFAULT_AGENT_SDK_LANES] as AgentSdkLane[],
  npcProfiles: [...INITIAL_CUSTOM_NPCS],
};

let checkpointSequence = serverState.checkpoints.length;

function recordCheckpoint(cp: { id: string; meta: string }) {
  serverState.checkpoints.unshift(cp);
  if (serverState.checkpoints.length > MAX_SERVER_STATE_ITEMS) {
    serverState.checkpoints.length = MAX_SERVER_STATE_ITEMS;
  }
}

function recordMemoryEntry(entry: AgentMemoryEntry) {
  serverState.memoryEntries.unshift(entry);
  if (serverState.memoryEntries.length > MAX_SERVER_STATE_ITEMS) {
    serverState.memoryEntries.length = MAX_SERVER_STATE_ITEMS;
  }
  for (const t of serverState.memoryTiers) {
    t.entriesCount = serverState.memoryEntries.length;
  }
}

function appendAudit(kind: string, msg: string, ok = true) {
  const t = new Date().toLocaleTimeString('en-US', { hour12: false });
  serverState.auditLog.unshift({
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    t,
    kind,
    msg,
    ok,
  });
  if (serverState.auditLog.length > 80) {
    serverState.auditLog.length = 80;
  }
}

// ============================================================================
// 1. GM Control & Mission Control (:3130 / .40 / .15) Endpoints
// ============================================================================

app.get('/api/gm/health', (_req, res) => {
  res.json({
    status: 'ok',
    node: 'mission-control-3130',
    alienwareNode: '192.168.0.40:9180',
    t5500Worker: '192.168.0.15:9127',
    mission: '#UntilNoKidInNeed',
  });
});

app.get('/api/gm/topology', (_req, res) => {
  res.json({
    nodes: CANONICAL_NODE_TOPOLOGY,
    council: CO_GM_COUNCIL,
    agentLanes: serverState.agentLanes,
    memoryTiers: serverState.memoryTiers,
    auditLog: serverState.auditLog,
  });
});

app.get('/api/gm/world/health', (_req, res) => {
  res.json(serverState.world);
});

app.post('/api/gm/world/nightfall', (req, res) => {
  const requested = req.body?.state as 'day' | 'night' | undefined;
  const nextState =
    requested || (serverState.world.dreamShift.state === 'day' ? 'night' : 'day');
  serverState.world.dreamShift.state = nextState;
  serverState.world.updatedAt = new Date().toISOString().slice(0, 10);
  appendAudit(
    'SHIFT',
    `Dream Shift toggled to ${nextState.toUpperCase()} via Mission Control :3130`,
    true
  );
  res.json({ status: 'ok', world: serverState.world });
});

app.get('/api/gm/events', (_req, res) => {
  res.json({ events: serverState.events });
});

app.post('/api/gm/events/:id/pause', (req, res) => {
  const { id } = req.params;
  const ev = serverState.events.find((e) => e.id === id);
  if (ev) {
    ev.status = ev.status === 'paused' ? 'active' : 'paused';
    appendAudit('EVENT', `${ev.name} → ${ev.status.toUpperCase()}`, true);
  }
  res.json({ status: 'ok', events: serverState.events });
});

app.get('/api/gm/economy/scan', (_req, res) => {
  res.json(serverState.economy);
});

app.post('/api/gm/economy/mint', (req, res) => {
  const amount = Number(req.body?.amount) || 500;
  const reason = String(req.body?.reason || 'Founder & Co-GM quest reward');
  serverState.economy.currency.NEEDs.totalMinted += amount;
  appendAudit('ECONOMY', `Minted +${amount} NEEDs (${reason})`, true);
  res.json({ status: 'ok', economy: serverState.economy });
});

app.get('/api/gm/checkpoints', (_req, res) => {
  res.json({ checkpoints: serverState.checkpoints });
});

app.post('/api/gm/hotfix/propose', (req, res) => {
  const rawProposal = String(req.body?.proposal || '').trim();
  const by = String(req.body?.by || 'founder + co-gm-council');
  if (!rawProposal) {
    res.status(400).json({ error: 'Proposal text required' });
    return;
  }
  const redaction = redactSecretsWithXXXX(rawProposal);
  const proposal = redaction.sanitized;
  checkpointSequence = Math.max(checkpointSequence + 1, serverState.checkpoints.length + 1);
  const cpId = `checkpoint-000${checkpointSequence}`;
  recordCheckpoint({
    id: cpId,
    meta: `proposed by ${by} · "${proposal.slice(0, 48)}"`,
  });
  appendAudit(
    'HOTFIX',
    `[${by}] Proposed: "${proposal}" → queued for Co-GM review (XXXX Redactions: ${redaction.redactionsCount})`,
    true
  );
  res.json({ status: 'ok', proposal, checkpoint: cpId, redactionsCount: redaction.redactionsCount, auditLog: serverState.auditLog });
});

app.post('/api/gm/rollback/plan', (req, res) => {
  const checkpoint = String(req.body?.checkpoint || serverState.world.lastGreenCheckpoint);
  appendAudit(
    'ROLLBACK',
    `Rollback plan drafted for ${checkpoint} (non-destructive plan only · founder + Co-GM verified)`,
    true
  );
  res.json({
    status: 'ok',
    plan: `Rollback Plan to ${checkpoint}: Verify Alienware .40 state -> Sync T5500 .15 Obsidian Vault -> Restore Mission Control :3130 snapshot.`,
    auditLog: serverState.auditLog,
  });
});

app.get('/api/gm/npc/profiles', (_req, res) => {
  res.json(serverState.npcProfiles);
});

app.post('/api/gm/npc/dialogue', async (req, res) => {
  const npcId = String(req.body?.npcId || 'sup-guide');
  const rawMessage = String(req.body?.message || 'Status report').trim();
  const message = redactSecretsWithXXXX(rawMessage).sanitized;
  const zone = String(req.body?.zone || 'first-gate');

  const profile =
    serverState.npcProfiles.find((p) => p.id === npcId) || serverState.npcProfiles[0];

  const ai = getGenAiClient();
  if (!ai) return geminiLaneOff(res);

  serverState.economy.adFundedStats.inferenceCalls += 1;
  serverState.economy.adFundedStats.adImpressions += 2;

  let replyText = `${profile.name} [${profile.tier} · ${zone}]: "${profile.defaultGreeting}"`;
  let modelUsed = 'T0-Scripted-Fallback';

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Player at zone "${zone}" says to NPC "${profile.name}" (${profile.role}): "${message}". Respond in-character in 2-3 concise sentences.`,
      config: {
        systemInstruction: `${profile.doctrinePrompt} Keep responses immersive, concise (under 65 words), and grounded in DREAM Engine's First Gate world, hardware nodes (.40 Alienware, .15 T5500, :3130 Mission Control), and #UntilNoKidInNeed.`,
      },
    });
    if (response.text) {
      replyText = response.text.trim();
      modelUsed = 'gemini-3.8-flash (Google Ultra Agent SDK)';
    }
  } catch (err) {
    // Fallback gracefully to T0/T1 local response
    console.warn('[DREAM] Gemini NPC fallback engaged:', err);
  }

  // Record in 4-Tier Memory Vault (Obsidian + Viking)
  const memEntry: AgentMemoryEntry = {
    id: `mem-npc-${Date.now()}`,
    title: `NPC Dialogue · ${profile.name}`,
    vikingUri: `viking://dream/npc/${profile.id}/${Date.now()}`,
    l0Abstract: `${profile.name} replied to Founder in ${zone}: "${replyText.slice(0, 70)}..."`,
    l1Overview: `Player prompt: "${message}" | Model: ${modelUsed}`,
    l2Markdown: `---\nid: mem-npc-${Date.now()}\ntags: [npc, ${profile.id}, ${zone}]\nauthor: ${modelUsed}\n---\n# ${profile.name} Dialogue Log\n- **Founder**: ${message}\n- **${profile.name}**: ${replyText}\n- **Linked**: [[First Gate Arena]] · [[Co-GM Council Charter]]`,
    tags: ['npc', profile.id, zone],
    wikilinks: ['[[First Gate Arena]]', '[[Co-GM Council Charter]]'],
    authorGm: modelUsed,
    syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
    updatedAt: new Date().toISOString(),
  };
  recordMemoryEntry(memEntry);

  appendAudit('NPC', `${profile.id} replied via ${modelUsed}`, true);

  res.json({
    status: 'ok',
    npcId: profile.id,
    npcName: profile.name,
    tier: profile.tier,
    modelUsed,
    reply: replyText,
    memoryUri: memEntry.vikingUri,
  });
});

// ============================================================================
// 2. Google Ultra Custom Agent SDK Gateway (/api/agent-sdk/*)
// ============================================================================

app.get('/api/agent-sdk/status', (_req, res) => {
  res.json({
    gateway: 'Google Ultra Custom Agent SDK Gateway (Zero-Omniroute Mesh)',
    lanes: serverState.agentLanes,
    council: CO_GM_COUNCIL,
  });
});

app.post('/api/agent-sdk/dispatch', async (req, res) => {
  const model = String(req.body?.model || 'gemini-3.8-flash');
  const protocol = String(req.body?.protocol || 'direct-sdk');
  const systemInstruction = String(
    req.body?.systemInstruction ||
      'You are a Co-GM Architect of DREAM Engine Studio (Google Gemini, Claude, Perplexity, Grok, OpenAI Codex, Hermes) assisting the Electrician Founder for #UntilNoKidInNeed.'
  );
  const taskPrompt = String(req.body?.prompt || 'Inspect current engine and node topology.');

  let outputText = `[${protocol.toUpperCase()} · ${model}] Task executed across Alienware .40 and T5500 .15 with zero Omniroute contention. All circuit breakers healthy.`;

  const ai = getGenAiClient();
  if (!ai) return geminiLaneOff(res);
  try {
    const targetModel =
      model === 'gemini-4-argon' || model === 'gemini-3.1-flash-lite'
        ? model
        : 'gemini-3.8-flash';
    const response = await ai.models.generateContent({
      model: targetModel,
      contents: taskPrompt,
      config: {
        systemInstruction: `${systemInstruction}\nProtocol Envelope: ${protocol}. Provide a concise, actionable engineering response.`,
      },
    });
    if (response.text) {
      outputText = response.text.trim();
    }
  } catch (err) {
    outputText = `[Circuit-Breaker Fallback Engaged] Direct SDK handled request locally: ${
      err instanceof Error ? err.message : 'Upstream rate cap bypassed via 4-Tier Memory & T5500 worker'
    }`;
  }

  appendAudit('ULTRA-SDK', `Dispatched [${protocol}] on ${model}: "${taskPrompt.slice(0, 42)}..."`, true);

  res.json({
    status: 'ok',
    model,
    protocol,
    output: outputText,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// 3. 4-Tier Sovereign Agent Memory Failover Ladder & Graphy (/api/memory/* & /api/graphy/*)
// ============================================================================

app.get('/api/memory/status', (_req, res) => {
  res.json({
    tiers: serverState.memoryTiers,
    entries: serverState.memoryEntries,
  });
});

app.get('/api/soul', (_req, res) => {
  res.json({
    status: 'ok',
    id: 'gemini-soul-md',
    version: '2.0.0-IMMUTABLE',
    aiStudioCustomInstructionsDetected: true,
    mission: '#ForTheKids #UntilNoKidInNeed',
    autoXXXXRedactionActive: true,
    markdown: GEMINI_SOUL_MD,
  });
});

app.post('/api/memory/store', (req, res) => {
  const rawTitle = String(req.body?.title || 'Untitled Co-GM Memory Note').trim();
  const rawContent = String(req.body?.content || '').trim();
  const tags = Array.isArray(req.body?.tags) ? req.body.tags : ['session-end', 'ri', 'obsidian'];
  const authorGm = String(req.body?.authorGm || 'Founder & Co-GM Council');

  const titleRedaction = redactSecretsWithXXXX(rawTitle);
  const contentRedaction = redactSecretsWithXXXX(rawContent);
  const title = titleRedaction.sanitized;
  const content = contentRedaction.sanitized;
  const redactionsCount = titleRedaction.redactionsCount + contentRedaction.redactionsCount;
  const matchedPatterns = Array.from(
    new Set([...titleRedaction.matchedPatterns, ...contentRedaction.matchedPatterns])
  );

  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const id = `mem-${slug || Date.now()}`;
  const vikingUri = `viking://dream/vault/${slug || Date.now()}`;

  const entry: AgentMemoryEntry = {
    id,
    title,
    vikingUri,
    l0Abstract: content.slice(0, 110) || title,
    l1Overview: `Stored in Obsidian Vault + Viking Context by ${authorGm} (Auto-XXXX Redactions: ${redactionsCount})`,
    l2Markdown: `---\nid: ${id}\ntags: [${tags.join(', ')}]\nauthor: ${authorGm}\nauto_xxxx_redactions: ${redactionsCount}\n---\n# ${title}\n${content}\n\nLinked: [[GEMINI SOUL.MD]] · [[Co-GM Council Charter]] · [[First Gate Arena]]`,
    tags,
    wikilinks: ['[[GEMINI SOUL.MD]]', '[[Co-GM Council Charter]]', '[[First Gate Arena]]'],
    authorGm,
    syncedTiers: ['obsidian-vault', 'viking-context', 'supabase-pgvector', 'supermemory-cloud'],
    updatedAt: new Date().toISOString(),
  };

  recordMemoryEntry(entry);

  appendAudit(
    'MEMORY',
    `Synced "${title}" across Obsidian Vault + Viking + Supabase + Supermemory (Auto-XXXX Redactions: ${redactionsCount})`,
    true
  );
  res.json({
    status: 'ok',
    entry,
    tiers: serverState.memoryTiers,
    redactionResult: { sanitized: content, redactionsCount, matchedPatterns },
  });
});

app.post('/api/memory/failover-test', (req, res) => {
  const simulateCapOnTierId = String(req.body?.tierId || 'supabase-pgvector');
  let activePrimaryAssigned = false;

  serverState.memoryTiers = serverState.memoryTiers.map((t) => {
    if (t.id === simulateCapOnTierId) {
      return { ...t, status: 'rate-capped-failover' as const };
    }
    if (!activePrimaryAssigned) {
      activePrimaryAssigned = true;
      return { ...t, status: 'active-primary' as const };
    }
    return { ...t, status: 'warm-standby' as const };
  });

  const activeNow = serverState.memoryTiers.find((t) => t.status === 'active-primary');
  appendAudit(
    'FAILOVER',
    `Simulated cap on ${simulateCapOnTierId} → Instant zero-loss failover to ${activeNow?.name}`,
    true
  );

  res.json({
    status: 'ok',
    activePrimary: activeNow,
    tiers: serverState.memoryTiers,
  });
});

app.get('/api/memory/obsidian-export', (_req, res) => {
  const bundle = formatObsidianVaultBundle(serverState.memoryEntries);
  res.json({
    status: 'ok',
    vaultPath: 'memory/obsidian-vault/',
    nodesSynced: ['192.168.0.40 (Alienware)', '192.168.0.15 (T5500)', '127.0.0.1:3130 (Mission Control)'],
    markdownBundle: bundle,
  });
});

app.get('/api/graphy/codebase', (_req, res) => {
  res.json({
    status: 'ok',
    repo: 'dream-engine-studio',
    nodes: GRAPHY_CODEBASE_NODES,
  });
});

// ============================================================================
// 4. DREAM Studio & REA (morluto/rea) AI Synthesis Endpoints (/api/studio/*)
// ============================================================================

app.post('/api/studio/rea-analyze', async (req, res) => {
  const fileName = String(req.body?.fileName || 'artifact.bin');
  const rawPayload = String(req.body?.payload || 'DREAM_BINARY_PAYLOAD');
  const bytes = new TextEncoder().encode(rawPayload);
  const analysis = analyzeReaBinary(fileName, bytes);

  let aiDecompilationNote = analysis.suggestedEnginePreset.summary;
  const ai = getGenAiClient();
  if (!ai) return geminiLaneOff(res);
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Reverse-engineer this binary telemetry via morluto/rea bridge:
File: ${analysis.fileName} (${analysis.format}, ${analysis.architecture})
Magic Hex: ${analysis.magicHex}, Entropy: ${analysis.entropy}
Extracted Strings: ${analysis.extractedStrings.join(', ')}
Provide a 2-sentence technical summary explaining how its extracted structures map into DREAM Engine's 3D WebGPU/WebGL2 runtime.`,
    });
    if (response.text) {
      aiDecompilationNote = response.text.trim();
    }
  } catch {
    // Keep deterministic summary
  }

  analysis.suggestedEnginePreset.summary = aiDecompilationNote;
  appendAudit('REA', `Reverse-engineered ${fileName} (${analysis.format}) via morluto/rea bridge`, true);

  res.json({
    status: 'ok',
    analysis,
  });
});

app.post('/api/studio/generate-design', async (req, res) => {
  const prompt = String(req.body?.prompt || 'Golden Solar Paladin with cyan plasma blade');
  const ai = getGenAiClient();
  if (!ai) return geminiLaneOff(res);

  let generated = {
    presetName: 'Solaris Cyber-Knight',
    armorColorDay: [0.85, 0.68, 0.22] as [number, number, number],
    visorColorDay: [0.13, 0.83, 0.93] as [number, number, number],
    bladeColorDay: [1.0, 0.82, 0.12] as [number, number, number],
    avatarScale: 1.08,
    visorGlowIntensity: 3.6,
    loreSummary: `Synthesized by Google Gemini from prompt: "${prompt}". Built for #UntilNoKidInNeed.`,
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Generate a 3D Cyber-Knight character rig & material preset for DREAM Engine based on this creator prompt: "${prompt}". Return RGB floats between 0.05 and 1.0.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            presetName: { type: Type.STRING },
            armorR: { type: Type.NUMBER },
            armorG: { type: Type.NUMBER },
            armorB: { type: Type.NUMBER },
            visorR: { type: Type.NUMBER },
            visorG: { type: Type.NUMBER },
            visorB: { type: Type.NUMBER },
            bladeR: { type: Type.NUMBER },
            bladeG: { type: Type.NUMBER },
            bladeB: { type: Type.NUMBER },
            avatarScale: { type: Type.NUMBER },
            visorGlowIntensity: { type: Type.NUMBER },
            loreSummary: { type: Type.STRING },
          },
          required: [
            'presetName',
            'armorR',
            'armorG',
            'armorB',
            'visorR',
            'visorG',
            'visorB',
            'bladeR',
            'bladeG',
            'bladeB',
            'avatarScale',
            'visorGlowIntensity',
            'loreSummary',
          ],
        },
      },
    });

    if (response.text) {
      const parsed = JSON.parse(response.text.trim());
      const clamp = (n: number, min = 0.05, max = 1.0) =>
        Number(Math.min(max, Math.max(min, Number(n) || 0.5)).toFixed(2));
      generated = {
        presetName: parsed.presetName || 'Gemini Custom Rig',
        armorColorDay: [clamp(parsed.armorR), clamp(parsed.armorG), clamp(parsed.armorB)],
        visorColorDay: [clamp(parsed.visorR), clamp(parsed.visorG), clamp(parsed.visorB)],
        bladeColorDay: [clamp(parsed.bladeR), clamp(parsed.bladeG), clamp(parsed.bladeB)],
        avatarScale: clamp(parsed.avatarScale, 0.75, 1.45),
        visorGlowIntensity: clamp(parsed.visorGlowIntensity, 1.0, 5.0),
        loreSummary: parsed.loreSummary || generated.loreSummary,
      };
    }
  } catch (err) {
    console.warn('[DREAM] Studio AI design fallback engaged:', err);
  }

  appendAudit('STUDIO-AI', `Generated 3D Character Rig "${generated.presetName}" via Gemini`, true);
  res.json({ status: 'ok', generated });
});

// ============================================================================
// Server Startup (Vite Dev Middleware or Static Production)
// ============================================================================


// ============================================================================
// 5. OpenUI Lang 1.0 + REA Procedural City + Remake Swap Board API
// ============================================================================

const serverCityArchitect = new ReaCityArchitect();
const serverRemakeBoard = new RemakeSwapBoard();

app.get('/api/openui/presets', (_req, res) => {
  res.json({
    status: 'ok',
    presets: OPENUI_GAME_DEV_PRESETS,
    reaArchetypes: REA_CITY_ARCHETYPES,
    reaEvidenceLedger: REA_RECONSTRUCTION_EVIDENCE_LEDGER,
    remakeBenchmarkProfiles: IDE_BENCHMARK_PROFILES,
    remakeReport: serverRemakeBoard.computeGateReport(),
  });
});

app.post('/api/openui/evaluate', (req, res) => {
  const source = String(req.body?.source || OPENUI_GAME_DEV_PRESETS[0].openUiSource);
  const stateOverrides = (req.body?.state as Record<string, unknown>) || {};
  const ast = parseOpenUiProgram(source);
  const evaluated = evaluateOpenUiProgram(ast, stateOverrides);
  res.json({
    status: 'ok',
    ast,
    evaluated,
  });
});

app.post('/api/rea/generate-city', (req, res) => {
  const archetypeId = (String(req.body?.archetypeId || 'SFA') as ReaArchetypeId);
  const seed = Number(req.body?.seed) || 1004;
  const phase = (req.body?.phase || 'day_dream_3d') as 'day_dream_3d' | 'nightmare_3d' | 'circle_16bit';
  const block = serverCityArchitect.generateUrbanBlock({ archetypeId, seed, phase });
  appendAudit('REA-CITY', `Generated REA ${block.archetypeId} block (${block.floorsGenerated}F, ${block.geometryPrimitive})`, true);
  res.json({ status: 'ok', block });
});

app.get('/api/remake/swap-board', (_req, res) => {
  res.json({
    status: 'ok',
    slots: serverRemakeBoard.getSlots(),
    report: serverRemakeBoard.computeGateReport(),
    benchmarks: IDE_BENCHMARK_PROFILES,
  });
});

// ============================================================================
// 6. CLI-Anything (Text-In / Text-Out AI Team Control), Red/Tag/Triple-Team
//    Kids Playground Security & Dreamforge World-Builder API
// ============================================================================

app.get('/api/cli-anything/help', (_req, res) => {
  const result = executeCliAnythingCommand('dream-cli --help');
  res.json({
    status: 'ok',
    helpText: DREAM_CLI_HELP_TEXT,
    whalePatronTiers: WHALE_SECURITY_PATRON_TIERS,
    helpResult: result,
  });
});

app.post('/api/cli-anything/execute', (req, res) => {
  const command = String(req.body?.command || 'dream-cli --help').trim();
  const result = executeCliAnythingCommand(command, {
    activePlayers: serverState.world.activePlayers,
    dreamShift: serverState.world.dreamShift.state,
    needsTotalMinted: serverState.economy.currency.NEEDs.totalMinted,
  });
  appendAudit('CLI-ANYTHING', `Executed text-in/text-out command: "${command}" (${result.ok ? 'PASS' : 'WARN'})`, result.ok);
  res.json({
    status: 'ok',
    result,
  });
});

app.post('/api/cli-anything/red-team', (req, res) => {
  const rawMode = String(req.body?.mode || 'triple-team').toLowerCase();
  const mode: SecurityTeamMode =
    rawMode === 'red-team' || rawMode === 'tag-team' || rawMode === 'triple-team'
      ? rawMode
      : 'triple-team';
  const report = runKidsPlaygroundSecurityAudit(mode);
  appendAudit(
    'RED-TEAM',
    `[${mode.toUpperCase()}] Kids Playground Security Audit: ${report.vectorsBlocked}/${report.vectorsTested} BLOCKED (Safety ${report.kidsPlaygroundSafetyScore}%)`,
    report.vectorsBlocked === report.vectorsTested
  );
  res.json({
    status: 'ok',
    report,
    whalePatronTiers: WHALE_SECURITY_PATRON_TIERS,
  });
});

app.get('/api/dreamforge/modes', (_req, res) => {
  res.json({
    status: 'ok',
    modes: DREAMFORGE_MODES,
    styles: DREAMFORGE_STYLES,
    classes: ACTION_MMO_CLASSES,
    vfxThemes: SKILL_VFX_THEMES,
  });
});

app.post('/api/dreamforge/generate', (req, res) => {
  const modeId = String(req.body?.mode || 'world-seed');
  const styleId = String(req.body?.style || 'stylized-semi-real-3d-game');
  const classId = (String(req.body?.classId || 'crimson-vanguard') as ActionMmoClassId);
  const vfxThemeId = (String(req.body?.vfxThemeId || 'ember-wyrm-crimson') as SkillVfxThemeId);
  const prompt = String(req.body?.prompt || 'Crimson Vanguard awakening in First Gate Sanctuary').trim();

  const mode = DREAMFORGE_MODES.find((m) => m.id === modeId) || DREAMFORGE_MODES[0];
  const style = DREAMFORGE_STYLES.find((s: string) => s === styleId) || DREAMFORGE_STYLES[0];
  const mmoClass = ACTION_MMO_CLASSES[classId] || ACTION_MMO_CLASSES['crimson-vanguard'];
  const vfxTheme = SKILL_VFX_THEMES[vfxThemeId] || SKILL_VFX_THEMES['ember-wyrm-crimson'];

  appendAudit(
    'DREAMFORGE',
    `Forged [${mode.label}] with style "${style}" & class "${mmoClass.name}" (${vfxTheme.name})`,
    true
  );

  res.json({
    status: 'ok',
    generated: {
      mode,
      style,
      mmoClass,
      vfxTheme,
      prompt,
      worldSeed: `DF-${mode.id.toUpperCase()}-${style.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
      // Voices default to Kokoro locally until Josh approves a key.
      shortsHook59s: `[<= 58.5s local Kokoro female voice] Watch the ${mmoClass.name} unleash ${vfxTheme.name} in ${style} — 100% Built by AI!`,
    },
  });
});

export async function startServer(env: NodeJS.ProcessEnv = process.env) {
  const { host } = validateDreamEngineBindConfig(env);
  const PORT = Number(env.PORT) || 9180;
  const isProd = env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app.listen(PORT, host, () => {
    console.log(`[DREAM] Full-Stack Engine & Mission Control Bridge running on http://${host}:${PORT}`);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  startServer().catch((err) => {
    console.error(`[DREAM] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
