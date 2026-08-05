import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.env.DREAM_ROOT || path.resolve(process.cwd(), "../../..");
const DATA_DIR = process.env.DREAM_LIVE_NPC_DATA || path.join(ROOT, "game", "server", "live-npc-lab", "data");
const MEMORY_LOG = path.join(DATA_DIR, "npc-memory.jsonl");
const MEMORY_SUMMARY_LOG = path.join(DATA_DIR, "npc-memory-summaries.jsonl");
const EVENT_LOG = path.join(DATA_DIR, "world-events.jsonl");
const FAILURE_LOG = path.join(DATA_DIR, "ai-failures.jsonl");
const LORE_SNIPPETS_FILE = path.join(DATA_DIR, "lore-snippets.json");
const DEFAULT_DIALOGUE_TIMEOUT_MS = 3000;
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_MAX_CALLS_PER_PLAYER_PER_HOUR = 20;
const CALL_WINDOW_MS = 60 * 60 * 1000;
const providerCallHistory = new Map();
const APPROVED_ACTION_TYPES = new Set([
  "suggest_hint",
  "suggest_marker",
  "suggest_event_pause",
  "suggest_quest_note"
]);
const SAFE_FALLBACKS = {
  ai_no_response: {
    lineId: "fallback_clear_signal",
    reply: "Stay with the next visible step. Move, check the marker, then report what changed."
  },
  ai_slow_response: {
    lineId: "fallback_keep_moving",
    reply: "Keep moving. Test the next action locally while I catch up."
  },
  ai_unsafe_output: {
    lineId: "fallback_safe_route",
    reply: "Hold the unsafe route. Follow the marked path and keep the next action small."
  },
  ai_provider_outage: {
    lineId: "fallback_local_guide",
    reply: "Local guide is active. Test movement, hit confirm, then the world event."
  },
  ai_rate_limited: {
    lineId: "fallback_retry_later",
    reply: "Use the local guide for now. Finish this step before asking again."
  }
};
const UNSAFE_REPLY_PATTERNS = [
  /api[_ -]?key/i,
  /secret/i,
  /token/i,
  /real[- ]?money benefit/i,
  /pay[- ]?to[- ]?win/i,
  /combat power for cash/i,
  /private accounting/i
];
const MEMORY_SCOPES = new Set(["player", "npc", "zone", "global_event"]);

export function nowIso() {
  return new Date().toISOString();
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function appendJsonl(file, record) {
  await ensureDataDir();
  await fs.appendFile(file, `${JSON.stringify(record)}\n`, "utf8");
}

async function readJsonl(file) {
  await ensureDataDir();

  let raw = "";
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

async function readLoreSnippetSet() {
  await ensureDataDir();

  let raw = "";
  try {
    raw = await fs.readFile(LORE_SNIPPETS_FILE, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.snippets) ? parsed.snippets : [];
}

function fallbackFor(failureMode) {
  return SAFE_FALLBACKS[failureMode] || SAFE_FALLBACKS.ai_provider_outage;
}

function zoneFromContext(context) {
  return String(context.worldState.zone || "unknown").slice(0, 120);
}

async function logAiFailure(context, route, failureMode, detail = {}) {
  const fallback = fallbackFor(failureMode);
  const record = {
    ts: nowIso(),
    kind: failureMode,
    playerId: context.playerId,
    npcId: context.npcId,
    zone: zoneFromContext(context),
    providerRouteName: String(route.provider || "unknown").slice(0, 80),
    fallbackLineId: fallback.lineId
  };

  if (Number.isFinite(detail.timeoutMs)) {
    record.timeoutMs = detail.timeoutMs;
  }

  if (Number.isFinite(detail.statusCode)) {
    record.statusCode = detail.statusCode;
  }

  if (detail.rejectedReason) {
    record.rejectedReason = String(detail.rejectedReason).slice(0, 120);
  }

  await appendJsonl(FAILURE_LOG, record);
  return record;
}

async function fallbackDialogue(context, route, failureMode, detail = {}) {
  const fallback = fallbackFor(failureMode);
  const failure = await logAiFailure(context, route, failureMode, detail);

  return {
    ok: true,
    provider: route.provider,
    degraded: true,
    failureMode,
    fallbackLineId: fallback.lineId,
    reply: fallback.reply,
    proposedActions: [
      {
        type: "suggest_hint",
        label: "Continue the local first-playable step."
      }
    ],
    failure
  };
}

function validateProviderCandidate(candidate) {
  if (!candidate || typeof candidate !== "object") {
    return {
      ok: false,
      reason: "missing_candidate"
    };
  }

  const reply = typeof candidate.reply === "string" ? candidate.reply.trim() : "";
  if (!reply) {
    return {
      ok: false,
      failureMode: "ai_no_response",
      reason: "missing_reply"
    };
  }

  if (UNSAFE_REPLY_PATTERNS.some((pattern) => pattern.test(reply))) {
    return {
      ok: false,
      failureMode: "ai_unsafe_output",
      reason: "unsafe_reply_text"
    };
  }

  const proposedActions = Array.isArray(candidate.proposedActions) ? candidate.proposedActions : [];
  for (const action of proposedActions) {
    const type = action && typeof action === "object" ? action.type : "";
    if (!APPROVED_ACTION_TYPES.has(type)) {
      return {
        ok: false,
        failureMode: "ai_unsafe_output",
        reason: `unapproved_action:${String(type).slice(0, 60)}`
      };
    }
  }

  return {
    ok: true,
    reply,
    proposedActions
  };
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(Object.assign(new Error("provider_timeout"), { code: "PROVIDER_TIMEOUT" }));
      }, timeoutMs);
    })
  ]);
}

function positiveInteger(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function costGuardKey(route, playerId) {
  return `${route.provider}:${playerId}`;
}

function checkAndRecordCostGuard(route, context) {
  const maxCalls = route.maxCallsPerPlayerPerHour;
  if (!Number.isFinite(maxCalls) || maxCalls < 1) {
    return {
      ok: false,
      reason: "invalid_call_budget"
    };
  }

  const now = Date.now();
  const key = costGuardKey(route, context.playerId);
  const recent = (providerCallHistory.get(key) || []).filter((ts) => now - ts < CALL_WINDOW_MS);

  if (recent.length >= maxCalls) {
    providerCallHistory.set(key, recent);
    return {
      ok: false,
      reason: "player_hourly_call_budget_exceeded"
    };
  }

  recent.push(now);
  providerCallHistory.set(key, recent);
  return {
    ok: true,
    callsUsed: recent.length,
    callsRemaining: Math.max(0, maxCalls - recent.length)
  };
}

export function selectProvider() {
  const cloudEnabled = process.env.DREAM_ENABLE_CLOUD_AI === "1";
  const provider = (process.env.DREAM_AI_PROVIDER || "mock").toLowerCase();
  const maxTokens = positiveInteger(process.env.DREAM_AI_MAX_TOKENS, DEFAULT_MAX_TOKENS, 1, 8000);
  const timeoutMs = positiveInteger(
    process.env.DREAM_AI_TIMEOUT_MS,
    DEFAULT_DIALOGUE_TIMEOUT_MS,
    100,
    120000
  );
  const maxCallsPerPlayerPerHour = positiveInteger(
    process.env.DREAM_AI_MAX_CALLS_PER_PLAYER_PER_HOUR,
    DEFAULT_MAX_CALLS_PER_PLAYER_PER_HOUR,
    1,
    1000
  );
  const costGuards = {
    maxTokens,
    timeoutMs,
    maxCallsPerPlayerPerHour,
    fallbackProvider: "mock"
  };

  if (!cloudEnabled) {
    return {
      provider: "mock",
      cloudEnabled: false,
      reason: "cloud disabled",
      ...costGuards
    };
  }

  return {
    provider,
    cloudEnabled: true,
    reason: "cloud explicitly enabled",
    ...costGuards
  };
}

export function buildNpcContext(input) {
  const npcId = String(input.npcId || "sup-guide").slice(0, 80);
  const playerId = String(input.playerId || "anonymous").slice(0, 80);
  const message = String(input.message || "").trim().slice(0, 2000);
  const worldState = typeof input.worldState === "object" && input.worldState !== null
    ? input.worldState
    : {};

  return {
    npcId,
    playerId,
    message,
    worldState
  };
}

export function mockNpcReply(context) {
  return buildMockNpcReply(context, []);
}

function buildMockNpcReply(context, loreSnippets) {
  const zone = context.worldState.zone || "unknown zone";
  const threat = context.worldState.threat || "unknown threat";

  if (!context.message) {
    return "I need a clear signal before I guide the next move.";
  }

  const lines = [
    `I am tracking ${zone}.`,
    `Threat reads ${threat}.`,
    "Test one thing at a time: movement feel, hit confirm, then world response.",
    "If the world changes, I will log it before I recommend the next action."
  ];

  if (loreSnippets.length) {
    const loreLine = loreSnippets
      .map((snippet) => `${snippet.title}: ${snippet.text}`)
      .join(" ");
    lines.splice(2, 0, `Local lore says ${loreLine}`);
  }

  return lines.join(" ");
}

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9@_-]+/g, " ")
    .trim();
}

export async function retrieveLoreSnippets(context, options = {}) {
  const limit = Number.isFinite(options.limit) ? Math.max(1, Math.floor(options.limit)) : 3;
  const snippets = await readLoreSnippetSet();
  const zone = String(context.worldState?.zone || context.worldState?.zoneId || "").toLowerCase();
  const searchText = normalizeSearchText([
    context.npcId,
    context.message,
    context.worldState?.zone,
    context.worldState?.zoneId,
    context.worldState?.threat,
    context.worldState?.timeOfDay
  ].filter(Boolean).join(" "));

  const scored = snippets
    .map((snippet) => {
      const tags = Array.isArray(snippet.tags) ? snippet.tags : [];
      const zoneMatch = snippet.zoneId && String(snippet.zoneId).toLowerCase() === zone ? 2 : 0;
      const tagMatches = tags.filter((tag) => searchText.includes(normalizeSearchText(tag))).length;
      const titleMatch = searchText.includes(normalizeSearchText(snippet.title)) ? 1 : 0;
      const score = zoneMatch + tagMatches + titleMatch;

      return {
        snippet,
        score
      };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || String(left.snippet.snippetId).localeCompare(String(right.snippet.snippetId)));

  return scored.slice(0, limit).map(({ snippet }) => ({
    snippetId: String(snippet.snippetId || "").slice(0, 80),
    title: String(snippet.title || "").slice(0, 120),
    zoneId: String(snippet.zoneId || "").slice(0, 120),
    text: String(snippet.text || "").slice(0, 500),
    tags: Array.isArray(snippet.tags) ? snippet.tags.map((tag) => String(tag).slice(0, 60)) : []
  }));
}

export async function handleDialogue(input, options = {}) {
  const context = buildNpcContext(input);
  const route = selectProvider();

  if (route.provider !== "mock") {
    const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : route.timeoutMs;

    if (typeof options.providerCall !== "function") {
      return fallbackDialogue(context, route, "ai_provider_outage", {
        rejectedReason: "provider_implementation_disabled"
      });
    }

    const costGuard = checkAndRecordCostGuard(route, context);
    if (!costGuard.ok) {
      return fallbackDialogue(context, route, "ai_rate_limited", {
        rejectedReason: costGuard.reason
      });
    }

    try {
      const candidate = await withTimeout(Promise.resolve(options.providerCall(context, route)), timeoutMs);
      const validated = validateProviderCandidate(candidate);

      if (!validated.ok) {
        return fallbackDialogue(context, route, validated.failureMode || "ai_unsafe_output", {
          rejectedReason: validated.reason
        });
      }

      await appendJsonl(MEMORY_LOG, {
        ts: nowIso(),
        kind: "dialogue",
        route,
        context,
        reply: validated.reply,
        proposedActions: validated.proposedActions
      });

      return {
        ok: true,
        provider: route.provider,
        reply: validated.reply,
        proposedActions: validated.proposedActions
      };
    } catch (error) {
      if (error.code === "PROVIDER_TIMEOUT") {
        return fallbackDialogue(context, route, "ai_slow_response", { timeoutMs });
      }

      const statusCode = Number.isFinite(error.statusCode) ? error.statusCode : undefined;
      return fallbackDialogue(context, route, statusCode === 429 ? "ai_rate_limited" : "ai_provider_outage", {
        statusCode,
        rejectedReason: error.code || "provider_error"
      });
    }
  }

  const loreSnippets = await retrieveLoreSnippets(context);
  const reply = buildMockNpcReply(context, loreSnippets);
  await appendJsonl(MEMORY_LOG, {
    ts: nowIso(),
    kind: "dialogue",
    route,
    context,
    reply,
    loreSnippetIds: loreSnippets.map((snippet) => snippet.snippetId)
  });

  return {
    ok: true,
    provider: "mock",
    reply,
    loreSnippets,
    nextPrototypeFocus: [
      "movement feel",
      "hit confirm",
      "world event logging",
      "memory retrieval"
    ]
  };
}

export async function readAiFailures(playerId) {
  await ensureDataDir();

  let raw = "";
  try {
    raw = await fs.readFile(FAILURE_LOG, "utf8");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const wanted = playerId ? String(playerId).slice(0, 80) : null;
  const rows = raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((row) => !wanted || row.playerId === wanted)
    .slice(-50);

  return {
    ok: true,
    count: rows.length,
    rows
  };
}

export async function handleWorldEvent(input) {
  const record = {
    ts: nowIso(),
    kind: "world_event",
    eventType: String(input.eventType || "unknown").slice(0, 80),
    actorId: String(input.actorId || "system").slice(0, 80),
    zone: String(input.zone || "unknown").slice(0, 120),
    payload: typeof input.payload === "object" && input.payload !== null ? input.payload : {}
  };

  await appendJsonl(EVENT_LOG, record);

  return {
    ok: true,
    recorded: record
  };
}

function parseMemoryQuery(query) {
  if (typeof query === "string" || query === null || query === undefined) {
    return {
      playerId: query ? String(query).slice(0, 80) : null,
      scopes: ["player"],
      compatibilityMode: true
    };
  }

  const requestedScopes = Array.isArray(query.scopes)
    ? query.scopes
    : String(query.scopes || "")
      .split(",")
      .map((scope) => scope.trim())
      .filter(Boolean);

  const scopes = requestedScopes.length
    ? requestedScopes.filter((scope) => MEMORY_SCOPES.has(scope))
    : [...MEMORY_SCOPES];

  return {
    playerId: query.playerId ? String(query.playerId).slice(0, 80) : null,
    npcId: query.npcId ? String(query.npcId).slice(0, 80) : null,
    zone: query.zone ? String(query.zone).slice(0, 120) : null,
    eventType: query.eventType ? String(query.eventType).slice(0, 80) : null,
    scopes,
    compatibilityMode: false
  };
}

function dialogueScopeMatches(row, query) {
  const matches = [];
  const playerId = row.context?.playerId;
  const npcId = row.context?.npcId;
  const zone = row.context?.worldState?.zone || row.context?.worldState?.zoneId;

  if (query.scopes.includes("player") && (!query.playerId || playerId === query.playerId)) {
    matches.push({ scope: "player", subjectId: playerId || "unknown" });
  }

  if (query.scopes.includes("npc") && (!query.npcId || npcId === query.npcId)) {
    matches.push({ scope: "npc", subjectId: npcId || "unknown" });
  }

  if (query.scopes.includes("zone") && (!query.zone || zone === query.zone)) {
    matches.push({ scope: "zone", subjectId: zone || "unknown" });
  }

  return matches;
}

function eventScopeMatches(row, query) {
  const matches = [];

  if (query.scopes.includes("zone") && (!query.zone || row.zone === query.zone)) {
    matches.push({ scope: "zone", subjectId: row.zone || "unknown" });
  }

  if (query.scopes.includes("global_event") && (!query.eventType || row.eventType === query.eventType)) {
    matches.push({ scope: "global_event", subjectId: row.eventType || "unknown" });
  }

  return matches;
}

function summaryScopeMatches(row, query) {
  const matches = [];

  if (query.scopes.includes("player") && (!query.playerId || row.playerId === query.playerId)) {
    matches.push({ scope: "player", subjectId: row.playerId || "unknown" });
  }

  if (query.scopes.includes("npc")) {
    for (const npcId of row.npcIds || []) {
      if (!query.npcId || npcId === query.npcId) {
        matches.push({ scope: "npc", subjectId: npcId || "unknown" });
      }
    }
  }

  if (query.scopes.includes("zone")) {
    for (const zone of row.zones || []) {
      if (!query.zone || zone === query.zone) {
        matches.push({ scope: "zone", subjectId: zone || "unknown" });
      }
    }
  }

  return matches;
}

function summarizeDialogueRows(rows, playerId) {
  const npcIds = [...new Set(rows.map((row) => row.context?.npcId).filter(Boolean))].sort();
  const zones = [...new Set(rows.map((row) => row.context?.worldState?.zone).filter(Boolean))].sort();
  const messages = rows
    .map((row) => String(row.context?.message || "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const firstTs = rows[0]?.ts || nowIso();
  const lastTs = rows.at(-1)?.ts || firstTs;

  return {
    ts: nowIso(),
    kind: "dialogue_summary",
    playerId,
    firstTs,
    lastTs,
    sourceCount: rows.length,
    npcIds,
    zones,
    summary: [
      `Compacted ${rows.length} older dialogue rows for ${playerId}.`,
      npcIds.length ? `NPCs: ${npcIds.join(", ")}.` : "",
      zones.length ? `Zones: ${zones.join(", ")}.` : "",
      messages.length ? `Recent player asks: ${messages.join(" | ")}` : ""
    ].filter(Boolean).join(" ")
  };
}

export async function compactMemory(options = {}) {
  const keepLatest = Number.isFinite(options.keepLatest) ? Math.max(1, Math.floor(options.keepLatest)) : 20;
  const playerFilter = options.playerId ? String(options.playerId).slice(0, 80) : null;
  const dialogueRows = await readJsonl(MEMORY_LOG);
  const summaryRows = await readJsonl(MEMORY_SUMMARY_LOG);
  const lastSummaryByPlayer = new Map();

  for (const row of summaryRows) {
    if (row.kind === "dialogue_summary" && row.playerId && row.lastTs) {
      const existing = lastSummaryByPlayer.get(row.playerId);
      if (!existing || String(row.lastTs).localeCompare(String(existing)) > 0) {
        lastSummaryByPlayer.set(row.playerId, row.lastTs);
      }
    }
  }

  const byPlayer = new Map();
  for (const row of dialogueRows) {
    if (row.kind !== "dialogue") continue;

    const playerId = row.context?.playerId || "anonymous";
    if (playerFilter && playerId !== playerFilter) continue;

    const lastSummaryTs = lastSummaryByPlayer.get(playerId);
    if (lastSummaryTs && String(row.ts || "").localeCompare(String(lastSummaryTs)) <= 0) {
      continue;
    }

    if (!byPlayer.has(playerId)) byPlayer.set(playerId, []);
    byPlayer.get(playerId).push(row);
  }

  const summaries = [];
  for (const [playerId, rows] of byPlayer.entries()) {
    rows.sort((left, right) => String(left.ts || "").localeCompare(String(right.ts || "")));
    if (rows.length <= keepLatest) continue;

    const compactRows = rows.slice(0, rows.length - keepLatest);
    summaries.push(summarizeDialogueRows(compactRows, playerId));
  }

  for (const summary of summaries) {
    await appendJsonl(MEMORY_SUMMARY_LOG, summary);
  }

  return {
    ok: true,
    keepLatest,
    playerId: playerFilter,
    summariesWritten: summaries.length,
    rawRowsPreserved: dialogueRows.length,
    summaries
  };
}

export async function readMemory(queryInput) {
  const query = parseMemoryQuery(queryInput);
  const dialogueRows = await readJsonl(MEMORY_LOG);
  const rows = [];

  for (const row of dialogueRows) {
    const scopeMatches = dialogueScopeMatches(row, query);
    if (scopeMatches.length) {
      rows.push({
        ...row,
        source: "npc-memory",
        scopeMatches
      });
    }
  }

  const summaryRows = await readJsonl(MEMORY_SUMMARY_LOG);
  for (const row of summaryRows) {
    const scopeMatches = summaryScopeMatches(row, query);
    if (scopeMatches.length) {
      rows.push({
        ...row,
        source: "memory-summaries",
        scopeMatches
      });
    }
  }

  if (!query.compatibilityMode && (query.scopes.includes("zone") || query.scopes.includes("global_event"))) {
    const eventRows = await readJsonl(EVENT_LOG);
    for (const row of eventRows) {
      const scopeMatches = eventScopeMatches(row, query);
      if (scopeMatches.length) {
        rows.push({
          ...row,
          source: "world-events",
          scopeMatches
        });
      }
    }
  }

  rows.sort((left, right) => String(left.ts || "").localeCompare(String(right.ts || "")));

  return {
    ok: true,
    scopes: query.scopes,
    count: rows.slice(-50).length,
    rows: rows.slice(-50)
  };
}
