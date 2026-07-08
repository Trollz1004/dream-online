import fs from "node:fs/promises";
import path from "node:path";

const ROOT = process.env.DREAM_ROOT || path.resolve(process.cwd(), "../../..");
const DATA_DIR = process.env.DREAM_LIVE_NPC_DATA || path.join(ROOT, "game", "server", "live-npc-lab", "data");
const MEMORY_LOG = path.join(DATA_DIR, "npc-memory.jsonl");
const EVENT_LOG = path.join(DATA_DIR, "world-events.jsonl");

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

export function selectProvider() {
  const cloudEnabled = process.env.DREAM_ENABLE_CLOUD_AI === "1";
  const provider = (process.env.DREAM_AI_PROVIDER || "mock").toLowerCase();

  if (!cloudEnabled) {
    return {
      provider: "mock",
      reason: "cloud disabled"
    };
  }

  return {
    provider,
    reason: "cloud explicitly enabled"
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
  const zone = context.worldState.zone || "unknown zone";
  const threat = context.worldState.threat || "unknown threat";

  if (!context.message) {
    return "I need a clear signal before I guide the next move.";
  }

  return [
    `I am tracking ${zone}.`,
    `Threat reads ${threat}.`,
    "Test one thing at a time: movement feel, hit confirm, then world response.",
    "If the world changes, I will log it before I recommend the next action."
  ].join(" ");
}

export async function handleDialogue(input) {
  const context = buildNpcContext(input);
  const route = selectProvider();

  if (route.provider !== "mock") {
    const blocked = {
      ok: false,
      provider: route.provider,
      reason: "provider implementation not enabled in prototype",
      reply: "Cloud guide is gated. Local guide remains active until the provider boundary is approved."
    };

    await appendJsonl(MEMORY_LOG, {
      ts: nowIso(),
      kind: "dialogue_blocked",
      route,
      context,
      reply: blocked.reply
    });

    return blocked;
  }

  const reply = mockNpcReply(context);
  await appendJsonl(MEMORY_LOG, {
    ts: nowIso(),
    kind: "dialogue",
    route,
    context,
    reply
  });

  return {
    ok: true,
    provider: "mock",
    reply,
    nextPrototypeFocus: [
      "movement feel",
      "hit confirm",
      "world event logging",
      "memory retrieval"
    ]
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

export async function readMemory(playerId) {
  await ensureDataDir();

  let raw = "";
  try {
    raw = await fs.readFile(MEMORY_LOG, "utf8");
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
    .filter((row) => !wanted || row.context?.playerId === wanted)
    .slice(-25);

  return {
    ok: true,
    count: rows.length,
    rows
  };
}
