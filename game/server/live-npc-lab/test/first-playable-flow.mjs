import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "dream-live-npc-lab-"));
process.env.DREAM_ENABLE_CLOUD_AI = "";
process.env.DREAM_AI_PROVIDER = "mock";
process.env.DREAM_LIVE_NPC_DATA = tempRoot;

const { handleDialogue, handleWorldEvent, readMemory, selectProvider } = await import("../src/npcEngine.js");

const playerId = "founder-first-playable-flow";
const route = selectProvider();
assert.equal(route.provider, "mock");
assert.equal(route.reason, "cloud disabled");

const dialogue = await handleDialogue({
  npcId: "sup-guide",
  playerId,
  message: "Guide my first test route.",
  worldState: {
    zone: "first-gate",
    threat: "low",
    timeOfDay: "dawn"
  }
});

assert.equal(dialogue.ok, true);
assert.equal(dialogue.provider, "mock");
assert.match(dialogue.reply, /first-gate/);
assert.match(dialogue.reply, /world response/);
assert.deepEqual(dialogue.nextPrototypeFocus, [
  "movement feel",
  "hit confirm",
  "world event logging",
  "memory retrieval"
]);

const event = await handleWorldEvent({
  eventType: "gate_flicker",
  actorId: playerId,
  zone: "first-gate",
  payload: {
    landmarkId: "mystery-gate",
    result: "guide_notified"
  }
});

assert.equal(event.ok, true);
assert.equal(event.recorded.eventType, "gate_flicker");
assert.equal(event.recorded.actorId, playerId);
assert.equal(event.recorded.zone, "first-gate");

const eventLog = await fs.readFile(path.join(tempRoot, "world-events.jsonl"), "utf8");
const eventRows = eventLog.trim().split(/\r?\n/).map((line) => JSON.parse(line));
assert.equal(eventRows.length, 1);
assert.equal(eventRows[0].payload.landmarkId, "mystery-gate");

const memory = await readMemory(playerId);
assert.equal(memory.ok, true);
assert.equal(memory.count, 1);
assert.equal(memory.rows[0].kind, "dialogue");
assert.equal(memory.rows[0].context.playerId, playerId);
assert.match(memory.rows[0].reply, /movement feel/);

console.log("first-playable NPC dialogue/event/memory flow passed");
